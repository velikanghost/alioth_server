import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrivyService } from '../../../shared/privy/privy.service';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
  TransactionStatus,
} from '../schemas/transaction.schema';
import { DepositDto } from '../dto/vault.dto';
import { VaultTokenService } from './vault-token.service';
import { VaultPortfolioService } from './vault-portfolio.service';
import { Web3Service } from '../../../shared/web3/web3.service';
import { TOKEN_ABI } from '../../../utils/abi';
import { parseUnits } from 'viem';

@Injectable()
export class VaultDepositService {
  private readonly logger = new Logger(VaultDepositService.name);

  private readonly MULTI_ASSET_VAULT_V2_ADDRESS =
    '0xFBC065B72f312Ad41676B977E01aBd9cf86CeF1A';

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private vaultTokenService: VaultTokenService,
    private vaultPortfolioService: VaultPortfolioService,
    private privyService: PrivyService,
    private web3Service: Web3Service,
  ) {}

  async deposit(
    userAddress: string,
    depositDto: DepositDto,
    aliothWallet: any,
  ): Promise<Transaction> {
    this.logger.log(
      `Processing deposit for user ${userAddress}: ${depositDto.amount} of ${depositDto.tokenAddress}`,
    );

    let transaction: any;

    try {
      // 1. Validate inputs
      await this.validateDeposit(depositDto);

      // // 2. Check token allowance and approve if needed
      // await this.checkAndApproveTokens(userAddress, depositDto, aliothWallet);

      // 3. Get user's current shares (before deposit)
      const sharesBefore = await this.vaultPortfolioService.getUserShares(
        aliothWallet.aliothWalletAddress,
        depositDto.tokenAddress,
        depositDto.chainId,
      );

      // 4. Calculate USD value using real Chainlink price and dynamic decimals
      const tokenPriceUSD = await this.vaultTokenService.getTokenPriceUSD(
        depositDto.tokenAddress,
      );

      // Get token decimals for accurate calculation
      const tokenDecimals = await this.vaultTokenService.getTokenDecimals(
        depositDto.tokenAddress,
        depositDto.chainId,
      );

      // Convert amount to decimal using actual token decimals
      const tokenAmount =
        parseFloat(depositDto.amount) / Math.pow(10, tokenDecimals);
      const amountUSD = tokenAmount * tokenPriceUSD;

      this.logger.log(
        `💰 Price calculation: ${tokenAmount.toFixed(6)} tokens × $${tokenPriceUSD.toFixed(2)} = $${amountUSD.toFixed(2)} USD`,
      );

      // 5. Create transaction record
      transaction = new this.transactionModel({
        userAddress,
        chainId: depositDto.chainId,
        type: TransactionType.DEPOSIT,
        tokenAddress: depositDto.tokenAddress,
        tokenSymbol: await this.vaultTokenService.getTokenSymbol(
          depositDto.tokenAddress,
          depositDto.chainId,
        ),
        amount: depositDto.amount,
        amountUSD,
        status: TransactionStatus.PENDING,
        timestamp: new Date(),
        initiatedBy: 'user',
        shares: {
          sharesBefore,
          sharesAfter: sharesBefore, // Will update after confirmation
          sharesDelta: '0', // Will update after confirmation
        },
      });

      await transaction.save();
      this.logger.log(`Created transaction record: ${transaction._id}`);

      // 6. Execute deposit on smart contract
      const executionResult = await this.executeDeposit(
        userAddress,
        depositDto,
        aliothWallet,
        depositDto.targetProtocol || 'aave', // Use specified protocol or default to aave
      );

      // 7. Wait for transaction confirmation using viem
      this.logger.log(`Transaction submitted: ${executionResult}`);
      const chainName = this.getChainName(depositDto.chainId);
      const publicClient = this.web3Service.getClient(chainName);

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: executionResult as `0x${string}`,
        timeout: 60000, // 60 second timeout
      });

      if (receipt.status !== 'success') {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      this.logger.log(
        `✅ Transaction confirmed in block ${receipt.blockNumber}`,
      );

      // 8. Get updated shares from contract after confirmation
      const sharesAfter = await this.vaultPortfolioService.getUserShares(
        aliothWallet.aliothWalletAddress,
        depositDto.tokenAddress,
        depositDto.chainId,
      );

      const sharesDelta = (
        BigInt(sharesAfter) - BigInt(sharesBefore)
      ).toString();

      // 9. Update transaction with confirmed data
      transaction.txHash = executionResult;
      transaction.status = TransactionStatus.CONFIRMED;
      transaction.confirmedAt = new Date();
      transaction.gasUsed = Number(receipt.gasUsed); // Real gas usage from receipt
      transaction.shares = {
        sharesBefore,
        sharesAfter,
        sharesDelta,
      };

      this.logger.log(
        `✅ Deposit confirmed: ${sharesBefore} -> ${sharesAfter} shares (+${sharesDelta}), Gas: ${receipt.gasUsed}`,
      );

      await transaction.save();

      this.logger.log(`✅ Deposit process completed: ${transaction.txHash}`);
      return transaction;
    } catch (error) {
      this.logger.error(`❌ Deposit failed for user ${userAddress}:`, error);

      // Update transaction status to failed if transaction was created
      if (transaction && transaction._id) {
        transaction.status = TransactionStatus.FAILED;
        transaction.error = {
          message: error.message,
          code: error.code || 'DEPOSIT_FAILED',
        };
        await transaction.save();
      }

      throw error;
    }
  }

  private async validateDeposit(depositDto: DepositDto): Promise<void> {
    // Check if amount is valid
    if (BigInt(depositDto.amount) <= 0) {
      throw new BadRequestException('Deposit amount must be greater than 0');
    }

    // Check emergency stop
    const isEmergencyStop = await this.vaultPortfolioService.isEmergencyStop(
      depositDto.chainId,
    );
    if (isEmergencyStop) {
      throw new BadRequestException(
        'Deposits are currently paused due to emergency stop',
      );
    }

    // TODO: Add more validations
    // - Check token is supported
    // - Check supply caps
    // - Check user balance and allowance
  }

  private async checkAndApproveTokens(
    userAddress: string,
    depositDto: DepositDto,
    aliothWallet: any,
  ): Promise<void> {
    try {
      // 1. Get token contract
      const chainName = this.getChainName(depositDto.chainId);
      const tokenContract = this.web3Service.createContract(
        chainName,
        depositDto.tokenAddress as `0x${string}`,
        TOKEN_ABI,
      );

      // 2. Check current allowance
      const allowance = (await tokenContract.read.allowance([
        aliothWallet.aliothWalletAddress as `0x${string}`,
        this.MULTI_ASSET_VAULT_V2_ADDRESS as `0x${string}`,
      ])) as bigint;

      const depositAmount = BigInt(depositDto.amount);

      // 3. If allowance is insufficient, execute approval
      if (allowance < depositAmount) {
        this.logger.log(
          `Insufficient allowance (${allowance} < ${depositAmount}). Executing approval...`,
        );

        // Execute approval transaction
        const txHash = await this.privyService.ensureTokenApproval(
          aliothWallet.privyWalletId,
          aliothWallet.aliothWalletAddress,
          depositDto.tokenAddress,
          this.MULTI_ASSET_VAULT_V2_ADDRESS,
          depositDto.amount,
          depositDto.chainId,
        );

        // Wait for approval confirmation
        const chainName = this.getChainName(depositDto.chainId);
        const publicClient = this.web3Service.getClient(chainName);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          timeout: 60000, // 60 second timeout
        });

        if (receipt.status !== 'success') {
          throw new Error('Token approval failed');
        }

        this.logger.log(`✅ Token approval confirmed: ${txHash}`);
      } else {
        this.logger.log('Token already approved for deposit amount');
      }
    } catch (error) {
      this.logger.error('Failed to check/approve tokens:', error);
      throw new BadRequestException(`Token approval failed: ${error.message}`);
    }
  }

  private async executeDeposit(
    userAddress: string,
    depositDto: DepositDto,
    aliothWallet: any,
    targetProtocol: string = 'aave', // Default protocol if not specified
  ): Promise<string> {
    try {
      // Calculate minimum shares (apply 0.5% slippage protection)
      const minShares =
        (BigInt(depositDto.amount) * BigInt(995)) / BigInt(1000);

      let txHash: string;

      // Execute deposit transaction via Privy-managed Alioth wallet
      txHash = await this.privyService.executeVaultDeposit(
        aliothWallet.privyWalletId,
        this.MULTI_ASSET_VAULT_V2_ADDRESS,
        depositDto.tokenAddress,
        depositDto.amount,
        minShares.toString(),
        depositDto.chainId,
        targetProtocol, // Pass the target protocol
      );

      this.logger.log(`✅ Privy vault deposit transaction executed: ${txHash}`);

      if (txHash) {
        return txHash;
      } else {
        throw new BadRequestException(
          'Deposit failed: Transaction hash is null',
        );
      }
    } catch (error) {
      this.logger.error(`Deposit execution failed: ${error.message}`);
      throw new BadRequestException(`Deposit failed: ${error.message}`);
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
