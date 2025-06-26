import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address } from 'viem';
import { Web3Service } from '../../../shared/web3/web3.service';
import { PrivyService } from '../../../shared/privy/privy.service';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
  TransactionStatus,
} from '../schemas/transaction.schema';
import { WithdrawDto } from '../dto/vault.dto';
import { VaultTokenService } from './vault-token.service';
import { VaultPortfolioService } from './vault-portfolio.service';
import { MULTI_ASSET_VAULT_V2_ABI } from 'src/utils/abi';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VaultWithdrawalService {
  private readonly logger = new Logger(VaultWithdrawalService.name);
  private readonly aliothVaultAddress: string;

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private vaultTokenService: VaultTokenService,
    private vaultPortfolioService: VaultPortfolioService,
    private privyService: PrivyService,
    private web3Service: Web3Service,
    private configService: ConfigService,
  ) {
    this.aliothVaultAddress = this.configService.get<string>(
      'config.contracts.aliothVault',
      '',
    );
  }

  async withdraw(
    userAddress: string,
    withdrawDto: WithdrawDto,
    aliothWallet: any,
  ): Promise<Transaction> {
    this.logger.log(
      `Processing withdrawal for user ${userAddress}: ${withdrawDto.shares} shares of ${withdrawDto.tokenAddress}`,
    );

    let transaction: any;

    try {
      // 1. Validate withdrawal
      await this.validateWithdrawal(userAddress, withdrawDto, aliothWallet);

      // 2. Get user's current shares (before withdrawal)
      const sharesBefore = await this.vaultPortfolioService.getUserShares(
        aliothWallet.aliothWalletAddress,
        withdrawDto.tokenAddress,
        withdrawDto.chainId,
      );

      // 3. Calculate USD value for the shares being withdrawn
      const tokenPriceUSD = await this.vaultTokenService.getTokenPriceUSD(
        withdrawDto.tokenAddress,
      );

      const tokenDecimals = await this.vaultTokenService.getTokenDecimals(
        withdrawDto.tokenAddress,
        withdrawDto.chainId,
      );

      const tokenAmount =
        parseFloat(withdrawDto.shares) / Math.pow(10, tokenDecimals);
      const amountUSD = tokenAmount * tokenPriceUSD;

      // 4. Create transaction record
      transaction = new this.transactionModel({
        userAddress,
        chainId: withdrawDto.chainId,
        type: TransactionType.WITHDRAW,
        tokenAddress: withdrawDto.tokenAddress,
        tokenSymbol: await this.vaultTokenService.getTokenSymbol(
          withdrawDto.tokenAddress,
          withdrawDto.chainId,
        ),
        amount: withdrawDto.shares,
        amountUSD,
        status: TransactionStatus.PENDING,
        timestamp: new Date(),
        initiatedBy: 'user',
        shares: {
          sharesBefore,
          sharesAfter: sharesBefore,
          sharesDelta: '0',
        },
      });

      await transaction.save();

      // 5. Execute withdrawal
      const executionResult = await this.executeWithdrawal(
        userAddress,
        withdrawDto,
        aliothWallet,
      );

      // 6. Update transaction
      transaction.txHash = executionResult;
      transaction.status = TransactionStatus.CONFIRMED;
      transaction.confirmedAt = new Date();
      await transaction.save();

      return transaction;
    } catch (error) {
      this.logger.error(`Withdrawal failed for user ${userAddress}:`, error);
      throw error;
    }
  }

  async getWithdrawalPreview(
    userAddress: string,
    withdrawDto: WithdrawDto,
    aliothWallet: any,
  ): Promise<any> {
    this.logger.log(
      `Generating withdrawal preview for ${userAddress}: ${withdrawDto.shares} shares of ${withdrawDto.tokenAddress}`,
    );

    try {
      const chainName = this.getChainName(withdrawDto.chainId);
      const contract = this.web3Service.createContract(
        chainName,
        this.aliothVaultAddress as Address,
        MULTI_ASSET_VAULT_V2_ABI,
      );

      // Get current user shares using Alioth wallet address
      const userShares = await this.vaultPortfolioService.getUserShares(
        aliothWallet.aliothWalletAddress, // Use Alioth wallet address for shares query
        withdrawDto.tokenAddress,
        withdrawDto.chainId,
      );

      // Get user position details using Alioth wallet address
      const userPosition = await contract.read.getUserPosition([
        aliothWallet.aliothWalletAddress as Address, // Use Alioth wallet address for position query
        withdrawDto.tokenAddress as Address,
      ]);

      const [totalUserShares, totalUserValue] = userPosition as [
        bigint,
        bigint,
        bigint,
        string,
      ];

      // Get token stats
      const tokenStats = await contract.read.getTokenStats([
        withdrawDto.tokenAddress as Address,
      ]);

      const [totalShares, totalValue] = tokenStats as [
        bigint,
        bigint,
        bigint,
        string,
      ];

      // Calculate estimated withdrawal amount
      let estimatedTokens = BigInt(0);
      let conversionRate = 0;

      if (totalUserShares > BigInt(0)) {
        // Calculate tokens per share for this user
        const tokensPerShare = totalUserValue / totalUserShares;
        estimatedTokens = BigInt(withdrawDto.shares) * tokensPerShare;
        conversionRate = parseFloat(tokensPerShare.toString()) / 1e18;
      }

      // Calculate various slippage scenarios
      const slippageOptions = [1, 2, 5, 10]; // 1%, 2%, 5%, 10%
      const slippageEstimates = slippageOptions.map((percent) => ({
        slippagePercent: percent,
        minAmount: (
          (estimatedTokens * BigInt(100 - percent)) /
          BigInt(100)
        ).toString(),
        minAmountFormatted:
          parseFloat(
            (
              (estimatedTokens * BigInt(100 - percent)) /
              BigInt(100)
            ).toString(),
          ) / 1e18,
      }));

      // Get token price for USD calculations
      const tokenPriceUSD = await this.vaultTokenService.getTokenPriceUSD(
        withdrawDto.tokenAddress,
      );
      const tokenDecimals = await this.vaultTokenService.getTokenDecimals(
        withdrawDto.tokenAddress,
        withdrawDto.chainId,
      );

      return {
        userShares: userShares,
        requestedShares: withdrawDto.shares,
        estimatedTokens: estimatedTokens.toString(),
        estimatedTokensFormatted:
          parseFloat(estimatedTokens.toString()) / Math.pow(10, tokenDecimals),
        estimatedUSD:
          (parseFloat(estimatedTokens.toString()) /
            Math.pow(10, tokenDecimals)) *
          tokenPriceUSD,
        conversionRate,
        tokensPerShare:
          parseFloat(totalUserShares.toString()) > 0
            ? parseFloat(totalUserValue.toString()) /
              parseFloat(totalUserShares.toString())
            : 0,
        slippageEstimates,
        contractData: {
          totalShares: totalShares.toString(),
          totalValue: totalValue.toString(),
          userTotalShares: totalUserShares.toString(),
          userTotalValue: totalUserValue.toString(),
        },
        recommendation: {
          suggestedMinAmount: slippageEstimates[2].minAmount, // 5% slippage
          warningMessage:
            BigInt(withdrawDto.shares) > BigInt(userShares)
              ? `Insufficient shares. You have ${userShares}, requesting ${withdrawDto.shares}`
              : null,
        },
      };
    } catch (error) {
      this.logger.error(`Withdrawal preview failed: ${error.message}`);
      throw error;
    }
  }

  private async validateWithdrawal(
    userAddress: string,
    withdrawDto: WithdrawDto,
    aliothWallet: any,
  ): Promise<void> {
    if (BigInt(withdrawDto.shares) <= 0) {
      throw new BadRequestException('Withdrawal shares must be greater than 0');
    }

    const userShares = await this.vaultPortfolioService.getUserShares(
      aliothWallet.aliothWalletAddress,
      withdrawDto.tokenAddress,
      withdrawDto.chainId,
    );

    if (BigInt(userShares) < BigInt(withdrawDto.shares)) {
      throw new BadRequestException('Insufficient shares for withdrawal');
    }
  }

  private async executeWithdrawal(
    userAddress: string,
    withdrawDto: WithdrawDto,
    aliothWallet: any,
  ): Promise<string> {
    try {
      return await this.privyService.executeVaultWithdrawal(
        aliothWallet.privyWalletId,
        this.aliothVaultAddress,
        withdrawDto.tokenAddress,
        withdrawDto.shares,
        withdrawDto.minAmount || '1',
        withdrawDto.chainId,
        withdrawDto.targetProtocol || 'aave',
      );
    } catch (error) {
      this.logger.error(`Withdrawal execution failed: ${error.message}`);
      throw new BadRequestException(`Withdrawal failed: ${error.message}`);
    }
  }

  private getChainName(chainId: number): string {
    const chainMap: { [key: number]: string } = {
      11155111: 'sepolia', // Sepolia testnet (matches Web3Service)
      43113: 'avalancheFuji', // Avalanche Fuji testnet (matches Web3Service)
    };

    const chainName = chainMap[chainId];
    if (!chainName) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    return chainName;
  }
}
