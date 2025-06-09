import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { APRTrackingService } from '../../yield-vault/services/apr-tracking.service';
import { VaultService } from '../../yield-vault/services/vault.service';
import {
  UserVault,
  UserVaultDocument,
} from '../../yield-vault/schemas/user-vault.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
} from '../../yield-vault/schemas/transaction.schema';

export interface RebalanceAction {
  userAddress: string;
  tokenAddress: string;
  chainId: number;
  fromProtocol: string;
  toProtocol: string;
  amount: string;
  reason: string;
  confidence: number; // 0-100 confidence score
  estimatedGasUSD: number;
  expectedAPYImprovement: number;
}

export interface AllocationPlan {
  tokenAddress: string;
  chainId: number;
  currentAllocation: { [protocol: string]: number };
  targetAllocation: { [protocol: string]: number };
  rebalanceActions: RebalanceAction[];
  totalAPYImprovement: number;
  estimatedGasCost: number;
}

@Injectable()
export class YieldMonitoringAgent {
  private readonly logger = new Logger(YieldMonitoringAgent.name);
  private readonly REBALANCE_THRESHOLD_APY = 2.0; // 2% APY improvement threshold
  private readonly MIN_REBALANCE_AMOUNT_USD = 100; // Minimum $100 to rebalance (gas efficiency)
  private readonly MAX_REBALANCE_FREQUENCY_HOURS = 24; // Max once per day

  constructor(
    @InjectModel(UserVault.name)
    private userVaultModel: Model<UserVaultDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private aprTrackingService: APRTrackingService,
    private vaultService: VaultService,
  ) {}

  /**
   * ElizaOS-inspired agent that continuously monitors APRs across protocols
   * This would be called periodically (every 15 minutes) by a cron job
   */
  async monitorAndOptimize(): Promise<void> {
    this.logger.log('🤖 Yield Monitoring Agent: Starting optimization scan...');

    try {
      // 1. Get all active user vaults
      const activeUsers = await this.getActiveUsers();
      this.logger.log(`Found ${activeUsers.length} active users to monitor`);

      // 2. For each user, check for rebalancing opportunities
      for (const user of activeUsers) {
        if (this.shouldSkipUser(user)) {
          continue;
        }

        await this.analyzeUserOpportunities(user);
      }

      this.logger.log('✅ Yield Monitoring Agent: Optimization scan completed');
    } catch (error) {
      this.logger.error('❌ Yield Monitoring Agent failed:', error);
    }
  }

  /**
   * Analyze a specific user's portfolio for rebalancing opportunities
   */
  async analyzeUserOpportunities(userVault: UserVault): Promise<void> {
    this.logger.log(
      `🔍 Analyzing opportunities for user ${userVault.userAddress}`,
    );

    try {
      for (const balance of userVault.vaultBalances) {
        if (
          parseFloat(balance.estimatedValue.toString()) <
          this.MIN_REBALANCE_AMOUNT_USD
        ) {
          continue; // Skip small positions
        }

        const allocationPlan = await this.calculateOptimalAllocation(
          balance.tokenAddress,
          balance.chainId,
          userVault.riskProfile,
          balance.estimatedValue,
        );

        if (allocationPlan && this.shouldRebalance(allocationPlan)) {
          await this.executeRebalanceDecision(userVault, allocationPlan);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error analyzing user ${userVault.userAddress}:`,
        error,
      );
    }
  }

  /**
   * ElizaOS-inspired decision making: Calculate optimal allocation
   * This mimics how an AI agent would analyze data and make decisions
   */
  async calculateOptimalAllocation(
    tokenAddress: string,
    chainId: number,
    riskProfile: string,
    currentValueUSD: number,
  ): Promise<AllocationPlan | null> {
    try {
      // Get current best APRs across all protocols
      const bestAPR = await this.aprTrackingService.getBestAPRForToken(
        tokenAddress,
        chainId,
      );

      if (!bestAPR) {
        this.logger.warn(
          `No APR data found for token ${tokenAddress} on chain ${chainId}`,
        );
        return null;
      }

      // Get optimal allocation based on risk profile (ElizaOS-style decision making)
      const targetAllocation =
        await this.aprTrackingService.getOptimalAllocation(
          tokenAddress,
          chainId,
          riskProfile as any,
        );

      // Mock current allocation (in production, this would come from smart contracts)
      const currentAllocation = { aave: 100 }; // Currently 100% in Aave

      // Calculate if rebalancing is worth it
      const currentAPY = 4.5; // Mock current APY
      const targetAPY = bestAPR.totalAPY;
      const apyImprovement = targetAPY - currentAPY;

      // Generate rebalance actions
      const rebalanceActions: RebalanceAction[] = [];

      if (apyImprovement > this.REBALANCE_THRESHOLD_APY) {
        rebalanceActions.push({
          userAddress: '0x742d35Cc6635Cb6C9D1d618d8e5d87a3D19A7AD3', // Mock user
          tokenAddress,
          chainId,
          fromProtocol: 'aave',
          toProtocol: bestAPR.protocolName,
          amount: (currentValueUSD * 0.8).toString(), // Rebalance 80% for testing
          reason: `Higher APY detected: ${targetAPY.toFixed(2)}% vs current ${currentAPY.toFixed(2)}%`,
          confidence: this.calculateConfidence(
            apyImprovement,
            bestAPR.riskMetrics?.protocolRiskScore || 8,
          ),
          estimatedGasUSD: 25, // Estimated gas cost
          expectedAPYImprovement: apyImprovement,
        });
      }

      return {
        tokenAddress,
        chainId,
        currentAllocation,
        targetAllocation,
        rebalanceActions,
        totalAPYImprovement: apyImprovement,
        estimatedGasCost: 25,
      };
    } catch (error) {
      this.logger.error('Error calculating optimal allocation:', error);
      return null;
    }
  }

  /**
   * ElizaOS-inspired confidence calculation
   * Factors in APY improvement, protocol risk, and market conditions
   */
  private calculateConfidence(
    apyImprovement: number,
    protocolRiskScore: number,
  ): number {
    let confidence = 0;

    // Base confidence from APY improvement
    confidence += Math.min(apyImprovement * 20, 60); // Max 60 points from APY

    // Protocol risk adjustment
    confidence += Math.min(protocolRiskScore * 5, 30); // Max 30 points from risk

    // Market volatility adjustment (mock)
    confidence += 10; // Base market confidence

    return Math.min(confidence, 100);
  }

  /**
   * Decide whether to execute rebalancing
   * This simulates the agent's decision-making process
   */
  private shouldRebalance(allocationPlan: AllocationPlan): boolean {
    // Check APY improvement threshold
    if (allocationPlan.totalAPYImprovement < this.REBALANCE_THRESHOLD_APY) {
      return false;
    }

    // Check gas efficiency
    const annualizedGasSavings = allocationPlan.totalAPYImprovement * 1000; // Assume $1000 position
    if (annualizedGasSavings < allocationPlan.estimatedGasCost * 4) {
      // 4x gas cost threshold
      return false;
    }

    // Check confidence
    const avgConfidence =
      allocationPlan.rebalanceActions.reduce(
        (sum, action) => sum + action.confidence,
        0,
      ) / allocationPlan.rebalanceActions.length;

    return avgConfidence > 70; // Need 70%+ confidence
  }

  /**
   * Execute rebalancing decision (ElizaOS-style autonomous action)
   */
  private async executeRebalanceDecision(
    userVault: UserVault,
    allocationPlan: AllocationPlan,
  ): Promise<void> {
    this.logger.log(
      `🎯 Agent executing rebalance for user ${userVault.userAddress}`,
    );
    this.logger.log(
      `Expected APY improvement: ${allocationPlan.totalAPYImprovement.toFixed(2)}%`,
    );

    try {
      // Check user preferences first
      if (!userVault.preferences?.autoRebalance) {
        this.logger.log(
          '⏸️ Auto-rebalancing disabled for user, sending notification instead',
        );
        // TODO: Send notification to user about opportunity
        return;
      }

      // Check agent risk limits
      const userAgentSettings = userVault.agentSettings;
      if (userAgentSettings?.requireConfirmation) {
        this.logger.log(
          '✋ User requires confirmation for rebalancing, sending notification',
        );
        // TODO: Send confirmation request to user
        return;
      }

      // Create rebalance transaction record
      for (const action of allocationPlan.rebalanceActions) {
        const transaction = new this.transactionModel({
          userAddress: action.userAddress,
          chainId: action.chainId,
          type: TransactionType.REBALANCE,
          tokenAddress: action.tokenAddress,
          tokenSymbol: await this.getTokenSymbol(action.tokenAddress),
          amount: action.amount,
          status: 'pending',
          timestamp: new Date(),
          initiatedBy: 'agent',
          agentData: {
            agentId: 'yield-monitoring-agent',
            reason: action.reason,
            confidence: action.confidence,
          },
          protocolData: {
            fromProtocol: action.fromProtocol,
            toProtocol: action.toProtocol,
          },
        });

        await transaction.save();

        // In production, this would execute the actual smart contract transaction
        this.logger.log(
          `📝 Rebalance transaction recorded: ${transaction._id}`,
        );
      }

      // Update user statistics
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

      userVault.statistics.totalRebalances++;
      userVault.statistics.lastActivityAt = new Date();
      await (userVault as UserVaultDocument).save();

      this.logger.log(`✅ Rebalancing decision executed successfully`);
    } catch (error) {
      this.logger.error('❌ Failed to execute rebalancing decision:', error);
    }
  }

  /**
   * Get active users eligible for monitoring
   */
  private async getActiveUsers(): Promise<UserVault[]> {
    return this.userVaultModel
      .find({
        totalValueLocked: { $gt: this.MIN_REBALANCE_AMOUNT_USD },
        'preferences.autoRebalance': { $ne: false }, // Include users with autoRebalance = true or undefined
      })
      .limit(100) // Process max 100 users per cycle
      .exec();
  }

  /**
   * Check if user should be skipped (rate limiting, recent activity, etc.)
   */
  private shouldSkipUser(userVault: UserVault): boolean {
    // Skip if user paused auto-rebalancing
    if (userVault.preferences?.emergencyPause) {
      return true;
    }

    // Skip if recent rebalancing activity
    if (userVault.statistics?.lastActivityAt) {
      const hoursSinceLastActivity =
        (Date.now() - userVault.statistics.lastActivityAt.getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceLastActivity < this.MAX_REBALANCE_FREQUENCY_HOURS) {
        return true;
      }
    }

    return false;
  }

  private async getTokenSymbol(tokenAddress: string): Promise<string> {
    const tokenSymbols: { [address: string]: string } = {
      '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': 'AAVE',
      '0x29f2D40B0605204364af54EC677bD022dA425d03': 'WBTC',
      '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': 'WETH',
      '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0': 'USDT',
    };

    return tokenSymbols[tokenAddress] || 'UNKNOWN';
  }
}
