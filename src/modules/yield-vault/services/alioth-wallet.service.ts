import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AliothWallet,
  AliothWalletDocument,
} from '../schemas/alioth-wallet.schema';

export interface CreateAliothWalletParams {
  userAddress: string;
  privyWalletId: string;
  aliothWalletAddress: string;
  chainType: string;
  metadata?: any;
}

export interface WalletPerformanceUpdate {
  operation: 'deposit' | 'withdraw' | 'optimize' | 'swap';
  amount: string;
  txHash: string;
  gasUsed?: number;
  gasCost?: string;
}

@Injectable()
export class AliothWalletService {
  private readonly logger = new Logger(AliothWalletService.name);

  constructor(
    @InjectModel(AliothWallet.name)
    private aliothWalletModel: Model<AliothWalletDocument>,
  ) {}

  /**
   * Create a new Alioth wallet record in database
   */
  async createAliothWallet(
    params: CreateAliothWalletParams,
  ): Promise<AliothWallet> {
    try {
      this.logger.log(
        `Creating Alioth wallet record for user: ${params.userAddress}`,
      );

      // Check if user already has an Alioth wallet
      const existingWallet = await this.aliothWalletModel
        .findOne({ userAddress: params.userAddress })
        .exec();

      if (existingWallet) {
        this.logger.warn(
          `User ${params.userAddress} already has an Alioth wallet: ${existingWallet._id}`,
        );
        throw new Error(
          'You already have an Alioth wallet. Each address can only create one Alioth wallet.',
        );
      }

      const aliothWallet = new this.aliothWalletModel({
        userAddress: params.userAddress,
        privyWalletId: params.privyWalletId,
        aliothWalletAddress: params.aliothWalletAddress,
        chainType: params.chainType,
        isActive: true,
        metadata: params.metadata || {},
        performance: {
          totalDeposited: '0',
          totalWithdrawn: '0',
          currentBalance: '0',
          totalYieldEarned: '0',
          totalTransactions: 0,
          averageAPY: 0,
        },
      });

      await aliothWallet.save();

      this.logger.log(`✅ Alioth wallet record created: ${aliothWallet._id}`);
      return aliothWallet;
    } catch (error) {
      this.logger.error(`Failed to create Alioth wallet record:`, error);
      // Re-throw with a more specific message if it's a duplicate key error
      if (error.code === 11000) {
        throw new Error(
          'You already have an Alioth wallet. Each address can only create one Alioth wallet.',
        );
      }
      throw error;
    }
  }

  /**
   * Get Alioth wallet by ID
   */
  async getAliothWalletById(id: string): Promise<AliothWallet> {
    try {
      const wallet = await this.aliothWalletModel.findById(id).exec();
      if (!wallet) {
        throw new NotFoundException(`Alioth wallet not found: ${id}`);
      }
      return wallet;
    } catch (error) {
      this.logger.error(`Failed to get Alioth wallet ${id}:`, error);
      throw error;
    }
  }

  /**
   * Check if user already has an Alioth wallet
   */
  async hasExistingAliothWallet(userAddress: string): Promise<boolean> {
    try {
      const existingWallet = await this.aliothWalletModel
        .findOne({ userAddress, isActive: true })
        .exec();
      return !!existingWallet;
    } catch (error) {
      this.logger.error(`Failed to check existing Alioth wallet:`, error);
      return false;
    }
  }

  /**
   * Get all Alioth wallets for a user
   */
  async getUserAliothWallets(userAddress: string): Promise<AliothWallet[]> {
    try {
      const filter: any = { userAddress, isActive: true };
      const wallets = await this.aliothWalletModel.find(filter).exec();

      this.logger.log(
        `Found ${wallets.length} Alioth wallets for user ${userAddress}`,
      );
      return wallets;
    } catch (error) {
      this.logger.error(
        `Failed to get Alioth wallets for user ${userAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get Alioth wallet by Privy wallet ID
   */
  async getAliothWalletByPrivyId(privyWalletId: string): Promise<AliothWallet> {
    try {
      const wallet = await this.aliothWalletModel
        .findOne({ privyWalletId, isActive: true })
        .exec();

      if (!wallet) {
        throw new NotFoundException(
          `Alioth wallet not found for Privy ID: ${privyWalletId}`,
        );
      }

      return wallet;
    } catch (error) {
      this.logger.error(
        `Failed to get Alioth wallet by Privy ID ${privyWalletId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update wallet performance metrics
   */
  async updateWalletPerformance(
    walletId: string,
    update: WalletPerformanceUpdate,
  ): Promise<AliothWallet> {
    try {
      const wallet = await this.getAliothWalletById(walletId);

      if (!wallet.performance) {
        wallet.performance = {
          totalDeposited: '0',
          totalWithdrawn: '0',
          currentBalance: '0',
          totalYieldEarned: '0',
          totalTransactions: 0,
          averageAPY: 0,
        };
      }

      // Update transaction count
      wallet.performance.totalTransactions += 1;

      // Update amounts based on operation
      const amount = BigInt(update.amount || '0');

      switch (update.operation) {
        case 'deposit':
          wallet.performance.totalDeposited = (
            BigInt(wallet.performance.totalDeposited) + amount
          ).toString();
          wallet.performance.currentBalance = (
            BigInt(wallet.performance.currentBalance) + amount
          ).toString();
          break;

        case 'withdraw':
          wallet.performance.totalWithdrawn = (
            BigInt(wallet.performance.totalWithdrawn) + amount
          ).toString();
          wallet.performance.currentBalance = (
            BigInt(wallet.performance.currentBalance) - amount
          ).toString();
          break;

        case 'optimize':
          wallet.performance.lastOptimization = new Date();
          // Yield earned would be calculated based on optimization results
          break;
      }

      // Save updated wallet
      await (wallet as AliothWalletDocument).save();

      this.logger.log(
        `✅ Updated performance for wallet ${walletId}: ${update.operation} ${update.amount}`,
      );

      return wallet;
    } catch (error) {
      this.logger.error(`Failed to update wallet performance:`, error);
      throw error;
    }
  }

  /**
   * Deactivate Alioth wallet
   */
  async deactivateAliothWallet(walletId: string): Promise<AliothWallet> {
    try {
      const wallet = await this.aliothWalletModel
        .findByIdAndUpdate(walletId, { isActive: false }, { new: true })
        .exec();

      if (!wallet) {
        throw new NotFoundException(`Alioth wallet not found: ${walletId}`);
      }

      this.logger.log(`🔒 Alioth wallet deactivated: ${walletId}`);
      return wallet;
    } catch (error) {
      this.logger.error(
        `Failed to deactivate Alioth wallet ${walletId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update wallet metadata
   */
  async updateWalletMetadata(
    walletId: string,
    metadata: any,
  ): Promise<AliothWallet> {
    try {
      const wallet = await this.aliothWalletModel
        .findByIdAndUpdate(walletId, { metadata }, { new: true })
        .exec();

      if (!wallet) {
        throw new NotFoundException(`Alioth wallet not found: ${walletId}`);
      }

      this.logger.log(`📝 Alioth wallet metadata updated: ${walletId}`);
      return wallet;
    } catch (error) {
      this.logger.error(`Failed to update wallet metadata:`, error);
      throw error;
    }
  }

  /**
   * Get wallet performance summary
   */
  async getWalletPerformanceSummary(walletId: string): Promise<any> {
    try {
      const wallet = await this.getAliothWalletById(walletId);

      const performance = wallet.performance;
      const totalDeposited = parseFloat(performance?.totalDeposited || '0');
      const totalWithdrawn = parseFloat(performance?.totalWithdrawn || '0');
      const currentBalance = parseFloat(performance?.currentBalance || '0');
      const totalYieldEarned = parseFloat(performance?.totalYieldEarned || '0');

      // Calculate additional metrics
      const netDeposits = totalDeposited - totalWithdrawn;
      const totalReturn = totalYieldEarned / Math.max(totalDeposited, 1);
      const roi =
        ((currentBalance + totalWithdrawn - totalDeposited) /
          Math.max(totalDeposited, 1)) *
        100;

      return {
        walletId,
        aliothWalletAddress: wallet.aliothWalletAddress,
        performance: {
          ...performance,
          netDeposits: netDeposits.toString(),
          totalReturn: (totalReturn * 100).toFixed(2) + '%',
          roi: roi.toFixed(2) + '%',
        },
        metadata: wallet.metadata,
        createdAt: wallet.createdAt,
        lastUpdated: wallet.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet performance summary:`, error);
      throw error;
    }
  }

  /**
   * Get user's total Alioth wallet statistics
   */
  async getUserAliothWalletStats(userAddress: string): Promise<any> {
    try {
      const wallets = await this.getUserAliothWallets(userAddress);

      let totalBalance = BigInt(0);
      let totalDeposited = BigInt(0);
      let totalWithdrawn = BigInt(0);
      let totalYieldEarned = BigInt(0);
      let totalTransactions = 0;

      wallets.forEach((wallet) => {
        if (wallet.performance) {
          totalBalance += BigInt(wallet.performance.currentBalance || '0');
          totalDeposited += BigInt(wallet.performance.totalDeposited || '0');
          totalWithdrawn += BigInt(wallet.performance.totalWithdrawn || '0');
          totalYieldEarned += BigInt(
            wallet.performance.totalYieldEarned || '0',
          );
          totalTransactions += wallet.performance.totalTransactions || 0;
        }
      });

      return {
        userAddress,
        totalWallets: wallets.length,
        totalBalance: totalBalance.toString(),
        totalDeposited: totalDeposited.toString(),
        totalWithdrawn: totalWithdrawn.toString(),
        totalYieldEarned: totalYieldEarned.toString(),
        totalTransactions,
        wallets: wallets.map((w) => ({
          id: w._id.toString(),
          address: w.aliothWalletAddress,
          balance: w.performance?.currentBalance || '0',
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get user Alioth wallet stats:`, error);
      throw error;
    }
  }
}
