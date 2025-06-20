import { Injectable, Logger } from '@nestjs/common';
import { DepositDto, WithdrawDto } from '../dto/vault.dto';
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
  ): Promise<Transaction> {
    // Get user's Alioth wallet
    const aliothWallet = await this.getUserAliothWallet(
      userAddress,
      depositDto.aliothWalletId,
    );

    // Delegate to deposit service
    return this.vaultDepositService.deposit(
      userAddress,
      depositDto,
      aliothWallet,
    );
  }

  async withdraw(
    userAddress: string,
    withdrawDto: WithdrawDto,
  ): Promise<Transaction> {
    // Get user's Alioth wallet
    const aliothWallet = await this.getUserAliothWallet(
      userAddress,
      withdrawDto.aliothWalletId,
    );

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
    const aliothWallet = await this.getUserAliothWallet(
      userAddress,
      aliothWalletId,
    );

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
    const aliothWallet = await this.getUserAliothWallet(
      userAddress,
      withdrawDto.aliothWalletId,
    );

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
   * Get user's Alioth wallet by ID and verify ownership
   */
  private async getUserAliothWallet(
    userAddress: string,
    aliothWalletId: string,
  ): Promise<any> {
    try {
      // Get the Alioth wallet by ID
      const aliothWallet =
        await this.aliothWalletService.getAliothWalletById(aliothWalletId);

      // Verify that the wallet belongs to the user
      if (aliothWallet.userAddress !== userAddress) {
        throw new Error(
          'Unauthorized: Alioth wallet does not belong to this user',
        );
      }

      if (!aliothWallet.isActive) {
        throw new Error('Alioth wallet is inactive');
      }

      return aliothWallet;
    } catch (error) {
      this.logger.error(
        `Failed to get Alioth wallet ${aliothWalletId} for user ${userAddress}:`,
        error,
      );
      throw error;
    }
  }
}
