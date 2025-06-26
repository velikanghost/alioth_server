import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserVault, UserVaultDocument } from '../schemas/user-vault.schema';
import { Vault, VaultDocument } from '../schemas/vault.schema';
import { UserPreferencesDto } from '../dto/vault.dto';
import { VaultTokenService } from './vault-token.service';
import { VaultPortfolioService } from './vault-portfolio.service';

@Injectable()
export class VaultUserService {
  private readonly logger = new Logger(VaultUserService.name);

  constructor(
    @InjectModel(UserVault.name)
    private userVaultModel: Model<UserVaultDocument>,
    @InjectModel(Vault.name)
    private vaultModel: Model<VaultDocument>,
    private vaultTokenService: VaultTokenService,
    private vaultPortfolioService: VaultPortfolioService,
  ) {}

  async getUserVault(userAddress: string): Promise<UserVault> {
    let userVault = await this.userVaultModel.findOne({ userAddress });

    if (!userVault) {
      // Create new user vault if doesn't exist
      userVault = new this.userVaultModel({
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
      });
      await userVault.save();
    }

    return userVault;
  }

  async updateUserPreferences(
    userAddress: string,
    preferences: UserPreferencesDto,
  ): Promise<UserVault> {
    const userVault = await this.getUserVault(userAddress);

    if (preferences.riskProfile) {
      userVault.riskProfile = preferences.riskProfile;
    }

    if (!userVault.preferences) {
      userVault.preferences = {
        autoRebalance: true,
        maxSlippage: 0.5,
        rebalanceThreshold: 2.0,
        emergencyPause: false,
        notifications: {
          rebalance: true,
          harvest: true,
          emergencies: true,
        },
      };
    }

    if (preferences.autoRebalance !== undefined) {
      userVault.preferences.autoRebalance = preferences.autoRebalance;
    }

    if (preferences.maxSlippage !== undefined) {
      userVault.preferences.maxSlippage = preferences.maxSlippage;
    }

    if (preferences.rebalanceThreshold !== undefined) {
      userVault.preferences.rebalanceThreshold = preferences.rebalanceThreshold;
    }

    await (userVault as UserVaultDocument).save();
    return userVault;
  }

  async updateUserVault(
    userAddress: string,
    dto: any,
    sharesDelta: string,
    operation: 'deposit' | 'withdraw',
  ): Promise<void> {
    const userVault = await this.getUserVault(userAddress);

    // Find existing balance or create new one
    let vaultBalance = userVault.vaultBalances.find(
      (b) => b.tokenAddress === dto.tokenAddress && b.chainId === dto.chainId,
    );

    if (!vaultBalance) {
      vaultBalance = {
        chainId: dto.chainId,
        tokenAddress: dto.tokenAddress,
        tokenSymbol: await this.vaultTokenService.getTokenSymbol(
          dto.tokenAddress,
          dto.chainId,
        ),
        shares: '0',
        estimatedValue: 0,
        yieldEarned: 0,
        depositedAmount: '0',
        depositedValueUSD: 0,
        lastUpdated: new Date(),
      };
      userVault.vaultBalances.push(vaultBalance);
    }

    // Update shares
    const currentShares = BigInt(vaultBalance.shares);
    const delta = BigInt(sharesDelta);

    if (operation === 'deposit') {
      vaultBalance.shares = (currentShares + delta).toString();
      // Only deposits have amount property
      if ('amount' in dto) {
        vaultBalance.depositedAmount = (
          BigInt(vaultBalance.depositedAmount) + BigInt(dto.amount)
        ).toString();
      }
    } else {
      vaultBalance.shares = (currentShares - delta).toString();
    }

    vaultBalance.lastUpdated = new Date();

    // Update statistics
    if (!userVault.statistics) {
      userVault.statistics = {
        totalTransactions: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        averageAPY: 0,
        bestPerformingToken: '',
        totalRebalances: 0,
        lastActivityAt: new Date(),
      };
    }

    userVault.statistics.totalTransactions++;
    userVault.statistics.lastActivityAt = new Date();

    if (operation === 'deposit') {
      userVault.statistics.totalDeposits++;
    } else {
      userVault.statistics.totalWithdrawals++;
    }

    await (userVault as UserVaultDocument).save();
  }

  async syncUserVaultWithContract(
    userAddress: string,
    chainId: number = 11155111,
    aliothWalletId?: string,
  ): Promise<UserVault> {
    this.logger.log(
      `🔄 Syncing database with contract state for ${userAddress} on chain ${chainId}`,
    );

    try {
      // Get current contract state using Alioth wallet
      const contractData =
        await this.vaultPortfolioService.getUserPortfolioFromContract(
          userAddress,
          chainId,
          aliothWalletId,
        );

      // Get or create user vault
      let userVault = await this.userVaultModel.findOne({ userAddress });
      if (!userVault) {
        userVault = new this.userVaultModel({
          userAddress,
          vaultBalances: [],
          totalValueLocked: 0,
          totalYieldEarned: 0,
        });
      }

      // Update vault balances with contract data
      for (let i = 0; i < contractData.tokens.length; i++) {
        const tokenAddress = contractData.tokens[i];
        const shares = contractData.shares[i];
        const estimatedValue = contractData.values[i];
        const tokenSymbol = contractData.symbols[i];

        // Find existing balance or create new one
        let vaultBalance = userVault.vaultBalances.find(
          (b) => b.tokenAddress === tokenAddress && b.chainId === chainId,
        );

        if (!vaultBalance) {
          vaultBalance = {
            chainId,
            tokenAddress,
            tokenSymbol,
            shares: '0',
            estimatedValue: 0,
            yieldEarned: 0,
            depositedAmount: '0',
            depositedValueUSD: 0,
            lastUpdated: new Date(),
          };
          userVault.vaultBalances.push(vaultBalance);
        }

        // Update with contract data
        vaultBalance.shares = shares;
        vaultBalance.tokenSymbol = tokenSymbol;
        vaultBalance.estimatedValue = parseFloat(estimatedValue) / 1e18; // Convert from wei to tokens
        vaultBalance.lastUpdated = new Date();

        this.logger.log(
          `✅ Synced ${tokenSymbol} balance: ${shares} shares, ${vaultBalance.estimatedValue} tokens`,
        );
      }

      // Remove positions that no longer exist in the contract
      userVault.vaultBalances = userVault.vaultBalances.filter((balance) => {
        if (balance.chainId !== chainId) return true; // Keep other chains
        const stillExists = contractData.tokens.includes(balance.tokenAddress);
        if (!stillExists) {
          this.logger.log(
            `🗑️ Removing ${balance.tokenSymbol} position (no longer in contract)`,
          );
        }
        return stillExists;
      });

      // Update totals
      userVault.totalValueLocked = userVault.vaultBalances.reduce(
        (sum, balance) => sum + balance.estimatedValue,
        0,
      );

      await (userVault as UserVaultDocument).save();

      this.logger.log(
        `✅ Successfully synced vault for ${userAddress}: ${userVault.vaultBalances.length} positions, $${userVault.totalValueLocked.toFixed(2)} TVL`,
      );

      return userVault;
    } catch (error) {
      this.logger.error(
        `❌ Failed to sync vault for ${userAddress}: ${error.message}`,
      );
      throw error;
    }
  }

  async updateVaultStats(tokenAddress: string, chainId: number): Promise<void> {
    let vault = await this.vaultModel.findOne({ tokenAddress, chainId });

    if (!vault) {
      vault = new this.vaultModel({
        chainId,
        tokenAddress,
        tokenSymbol: await this.vaultTokenService.getTokenSymbol(
          tokenAddress,
          chainId,
        ),
        totalValueLocked: 0,
        currentAPR: 0,
        activeStrategies: [],
        status: 'active',
      });
    }

    // Update last activity
    vault.updatedAt = new Date();

    await vault.save();
  }
}
