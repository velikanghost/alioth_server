import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserPortfolio,
  UserPortfolioDocument,
} from '../../../shared/schemas/user-portfolio.schema';
import {
  MarketDataCache,
  MarketDataCacheDocument,
} from '../../../shared/schemas/market-data-cache.schema';

@Injectable()
export class PerformanceTrackingService {
  private readonly logger = new Logger(PerformanceTrackingService.name);

  constructor(
    @InjectModel(UserPortfolio.name)
    private userPortfolioModel: Model<UserPortfolioDocument>,
    @InjectModel(MarketDataCache.name)
    private marketDataCacheModel: Model<MarketDataCacheDocument>,
  ) {}

  /**
   * Get portfolio performance metrics for a user
   */
  async getPortfolioPerformance(
    userAddress: string,
    timeframe: string = '30d',
    chainId?: number,
  ): Promise<any> {
    try {
      const query: any = { userAddress };
      if (chainId) query.chainId = chainId;

      const portfolios = await this.userPortfolioModel.find(query).exec();

      if (!portfolios.length) {
        return {
          userAddress,
          timeframe,
          totalValue: 0,
          totalReturn: 0,
          totalReturnPercent: 0,
          averageAPY: 0,
          portfolios: [],
        };
      }

      const aggregatedMetrics = this.calculateAggregatedMetrics(portfolios);
      const timeBasedMetrics = await this.calculateTimeBasedMetrics(
        portfolios,
        timeframe,
      );

      return {
        userAddress,
        timeframe,
        ...aggregatedMetrics,
        ...timeBasedMetrics,
        portfolios: portfolios.map((p) => ({
          chainId: p.chainId,
          totalValueUSD: p.totalValueUSD,
          weightedAPY: p.weightedAPY,
          performanceMetrics: p.performanceMetrics,
          positionCount: p.positions.size,
          lastRebalance: p.lastRebalance,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get portfolio performance:', error);
      throw error;
    }
  }

  /**
   * Get performance comparison across different timeframes
   */
  async getPerformanceComparison(
    userAddress: string,
    timeframes: string[] = ['7d', '30d', '90d'],
  ): Promise<any> {
    try {
      const comparisons = await Promise.all(
        timeframes.map(async (timeframe) => {
          const performance = await this.getPortfolioPerformance(
            userAddress,
            timeframe,
          );
          return {
            timeframe,
            totalReturn: performance.totalReturn,
            totalReturnPercent: performance.totalReturnPercent,
            averageAPY: performance.averageAPY,
          };
        }),
      );

      return {
        userAddress,
        comparisons,
        summary: {
          bestTimeframe: comparisons.reduce((best, current) =>
            current.totalReturnPercent > best.totalReturnPercent
              ? current
              : best,
          ),
          worstTimeframe: comparisons.reduce((worst, current) =>
            current.totalReturnPercent < worst.totalReturnPercent
              ? current
              : worst,
          ),
          consistencyScore: this.calculateConsistencyScore(comparisons),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get performance comparison:', error);
      throw error;
    }
  }

  /**
   * Get yield optimization effectiveness metrics
   */
  async getOptimizationEffectiveness(userAddress: string): Promise<any> {
    try {
      const portfolios = await this.userPortfolioModel
        .find({ userAddress })
        .exec();

      if (!portfolios.length) {
        return {
          userAddress,
          optimizationScore: 0,
          totalRebalances: 0,
          averageYieldImprovement: 0,
          gasEfficiency: 0,
        };
      }

      const rebalanceHistory = portfolios
        .flatMap((p) => p.rebalanceHistory)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const optimizationMetrics = {
        totalRebalances: rebalanceHistory.length,
        averageYieldImprovement:
          rebalanceHistory.reduce(
            (sum, r) => sum + r.yieldImprovementPercent,
            0,
          ) / rebalanceHistory.length || 0,
        totalGasPaid: rebalanceHistory.reduce(
          (sum, r) => sum + r.gasCostUSD,
          0,
        ),
        autoRebalanceRatio:
          rebalanceHistory.filter((r) => r.executedBy === 'auto').length /
            rebalanceHistory.length || 0,
      };

      const optimizationScore =
        this.calculateOptimizationScore(optimizationMetrics);

      return {
        userAddress,
        optimizationScore,
        ...optimizationMetrics,
        recentRebalances: rebalanceHistory.slice(0, 10),
      };
    } catch (error) {
      this.logger.error('Failed to get optimization effectiveness:', error);
      throw error;
    }
  }

  /**
   * Get platform-wide performance statistics
   */
  async getPlatformPerformanceStats(): Promise<any> {
    try {
      const allPortfolios = await this.userPortfolioModel.find().exec();

      if (!allPortfolios.length) {
        return {
          totalUsers: 0,
          totalValueLocked: 0,
          averagePlatformAPY: 0,
          totalTransactions: 0,
        };
      }

      const stats = {
        totalUsers: new Set(allPortfolios.map((p) => p.userAddress)).size,
        totalValueLocked: allPortfolios.reduce(
          (sum, p) => sum + p.totalValueUSD,
          0,
        ),
        averagePlatformAPY:
          allPortfolios.reduce((sum, p) => sum + p.weightedAPY, 0) /
          allPortfolios.length,
        totalRebalances: allPortfolios.reduce(
          (sum, p) => sum + p.rebalanceHistory.length,
          0,
        ),
        totalYieldEarned: allPortfolios.reduce(
          (sum, p) => sum + p.totalYieldEarned,
          0,
        ),
      };

      return stats;
    } catch (error) {
      this.logger.error('Failed to get platform performance stats:', error);
      throw error;
    }
  }

  // Private helper methods
  private calculateAggregatedMetrics(portfolios: UserPortfolio[]): any {
    const totalValue = portfolios.reduce((sum, p) => sum + p.totalValueUSD, 0);
    const totalYieldEarned = portfolios.reduce(
      (sum, p) => sum + p.totalYieldEarned,
      0,
    );
    const averageAPY =
      portfolios.reduce((sum, p) => sum + p.weightedAPY, 0) / portfolios.length;

    const totalDeposited = portfolios.reduce(
      (sum, p) => sum + (p.performanceMetrics?.totalDeposited || 0),
      0,
    );

    return {
      totalValue,
      totalYieldEarned,
      averageAPY,
      totalReturn: totalValue - totalDeposited,
      totalReturnPercent:
        totalDeposited > 0
          ? ((totalValue - totalDeposited) / totalDeposited) * 100
          : 0,
    };
  }

  private async calculateTimeBasedMetrics(
    portfolios: UserPortfolio[],
    timeframe: string,
  ): Promise<any> {
    // This would calculate metrics based on historical data
    // For now, return mock data based on current portfolio state
    const days = this.timeframeToDays(timeframe);
    const dailyReturn =
      portfolios.reduce((sum, p) => sum + p.weightedAPY, 0) /
      portfolios.length /
      365;

    return {
      timeframeReturn: dailyReturn * days,
      volatility: Math.random() * 10, // Mock volatility
      sharpeRatio: Math.random() * 2, // Mock Sharpe ratio
      maxDrawdown: Math.random() * -20, // Mock max drawdown
    };
  }

  private calculateConsistencyScore(comparisons: any[]): number {
    const returns = comparisons.map((c) => c.totalReturnPercent);
    const average = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - average, 2), 0) /
      returns.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher consistency (score out of 100)
    return Math.max(0, 100 - standardDeviation * 10);
  }

  private calculateOptimizationScore(metrics: any): number {
    // Calculate optimization score based on multiple factors
    const yieldScore = Math.min(metrics.averageYieldImprovement * 10, 50);
    const frequencyScore = Math.min(metrics.totalRebalances * 2, 25);
    const automationScore = metrics.autoRebalanceRatio * 25;

    return Math.min(yieldScore + frequencyScore + automationScore, 100);
  }

  private timeframeToDays(timeframe: string): number {
    const timeframeMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    return timeframeMap[timeframe] || 30;
  }
}
