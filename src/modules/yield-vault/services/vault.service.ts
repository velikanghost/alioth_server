import { Injectable, Logger } from '@nestjs/common';
import { DepositDto, WithdrawDto, AIRecommendationDto } from '../dto/vault.dto';
import { VaultDepositService } from './vault-deposit.service';
import { VaultWithdrawalService } from './vault-withdrawal.service';
import { VaultPortfolioService } from './vault-portfolio.service';
import { VaultTokenService } from './vault-token.service';
import { VaultTransactionService } from './vault-transaction.service';
import { AliothWalletService } from './alioth-wallet.service';
import { Transaction } from '../schemas/transaction.schema';

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  constructor(
    private vaultDepositService: VaultDepositService,
    private vaultWithdrawalService: VaultWithdrawalService,
    private vaultPortfolioService: VaultPortfolioService,
    private vaultTokenService: VaultTokenService,
    private vaultTransactionService: VaultTransactionService,
    private aliothWalletService: AliothWalletService,
  ) {}

  async deposit(
    userAddress: string,
    depositDto: DepositDto,
    aiRecommendations?: AIRecommendationDto[],
  ): Promise<Transaction | any> {
    // Get user's Alioth wallet if not provided
    const aliothWallet = await this.getUserAliothWallet(userAddress);

    // Delegate to deposit service with AI recommendations
    return this.vaultDepositService.deposit(
      userAddress,
      depositDto,
      aliothWallet,
      aiRecommendations,
    );
  }

  async withdraw(
    userAddress: string,
    withdrawDto: WithdrawDto,
  ): Promise<Transaction> {
    // Get user's Alioth wallet
    const aliothWallet = await this.getUserAliothWallet(userAddress);

    // Delegate to withdrawal service
    return this.vaultWithdrawalService.withdraw(
      userAddress,
      withdrawDto,
      aliothWallet,
    );
  }

  async getUserPortfolioFromContract(
    userAddress: string,
    chainId: number = 11155111,
    aliothWalletId?: string,
  ): Promise<{
    tokens: string[];
    receiptTokens: string[];
    shares: string[];
    values: string[];
    symbols: string[];
    apys: string[];
  }> {
    return this.vaultPortfolioService.getUserPortfolioFromContract(
      userAddress,
      chainId,
      aliothWalletId,
    );
  }

  async isTokenSupported(
    tokenAddress: string,
    chainId: number,
  ): Promise<boolean> {
    return this.vaultPortfolioService.isTokenSupported(tokenAddress, chainId);
  }

  async approveToken(
    userAddress: string,
    aliothWalletId: string,
    tokenAddress: string,
    amount: string,
    chainId: number,
  ): Promise<string> {
    // Get user's Alioth wallet
    const aliothWallet = await this.getUserAliothWallet(userAddress);

    // Verify that the provided aliothWalletId matches the user's active wallet
    if (aliothWallet._id.toString() !== aliothWalletId) {
      throw new Error('Invalid Alioth wallet ID provided');
    }

    return this.vaultTokenService.approveToken(
      userAddress,
      aliothWalletId,
      tokenAddress,
      amount,
      chainId,
      aliothWallet,
    );
  }

  async getUserTransactions(
    userAddress: string,
    limit: number = 50,
  ): Promise<Transaction[]> {
    return this.vaultTransactionService.getUserTransactions(userAddress, limit);
  }

  async getWithdrawalPreview(
    userAddress: string,
    withdrawDto: WithdrawDto,
  ): Promise<any> {
    // Get user's Alioth wallet
    const aliothWallet = await this.getUserAliothWallet(userAddress);

    // Delegate to withdrawal service (need to add this method)
    // For now, return a simple preview
    return {
      userShares: '0',
      requestedShares: withdrawDto.shares,
      estimatedTokens: '0',
      message: 'Withdrawal preview temporarily unavailable during refactoring',
    };
  }

  async getUserVault(userAddress: string): Promise<any> {
    // Temporary implementation during refactoring
    return {
      userAddress,
      vaultBalances: [],
      totalValueLocked: 0,
      totalYieldEarned: 0,
      preferences: {
        autoRebalance: true,
        maxSlippage: 0.5,
        rebalanceThreshold: 2.0,
        emergencyPause: false,
        notifications: {
          rebalance: true,
          harvest: true,
          emergencies: true,
        },
      },
    };
  }

  async updateUserPreferences(
    userAddress: string,
    preferences: any,
  ): Promise<any> {
    // Temporary implementation during refactoring
    return this.getUserVault(userAddress);
  }

  async syncUserVaultWithContract(
    userAddress: string,
    chainId: number = 11155111,
    aliothWalletId?: string,
  ): Promise<any> {
    // Temporary implementation during refactoring
    return this.getUserVault(userAddress);
  }

  /**
   * Get user's active Alioth wallet
   */
  private async getUserAliothWallet(userAddress: string): Promise<any> {
    try {
      // Get user's active Alioth wallets
      const aliothWallets =
        await this.aliothWalletService.getUserAliothWallets(userAddress);

      if (!aliothWallets || aliothWallets.length === 0) {
        throw new Error(
          'No active Alioth wallet found for this user. Please create one first.',
        );
      }

      // Get the first active wallet or the first wallet if none are active
      const aliothWallet =
        aliothWallets.find((w) => w.isActive) || aliothWallets[0];

      if (!aliothWallet.isActive) {
        throw new Error('Alioth wallet is inactive');
      }

      return aliothWallet;
    } catch (error) {
      this.logger.error(
        `Failed to get Alioth wallet for user ${userAddress}:`,
        error,
      );
      throw error;
    }
  }
}
