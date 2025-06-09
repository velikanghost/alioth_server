import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserPortfolio,
  UserPortfolioDocument,
} from '../../ai-optimization/schemas/user-portfolio.schema';
import {
  AIDecisionLog,
  AIDecisionLogDocument,
} from '../../ai-optimization/schemas/ai-decision-log.schema';
import { PortfolioPerformanceDto } from '../../ai-optimization/dto/portfolio-performance.dto';

export interface PerformanceReport {
  userId: string;
  timeframe: string;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  averageGain: number;
  averageLoss: number;
  profitFactor: number;
  benchmarkComparison: {
    benchmark: string;
    outperformance: number;
    relativeSharpe: number;
    correlation: number;
  };
  aiDecisionMetrics: {
    totalDecisions: number;
    accurateDecisions: number;
    accuracyRate: number;
    averageConfidence: number;
    confidenceAccuracyCorrelation: number;
  };
  riskMetrics: {
    valueAtRisk: number;
    conditionalVaR: number;
    beta: number;
    alpha: number;
    informationRatio: number;
  };
  attribution: {
    assetAllocation: number;
    securitySelection: number;
    timing: number;
    interaction: number;
  };
}

export interface AIAccuracyMetrics {
  overallAccuracy: number;
  accuracyByConfidenceLevel: Record<string, number>;
  accuracyByTimeframe: Record<string, number>;
  accuracyByMarketCondition: Record<string, number>;
  predictionBias: number;
  calibrationScore: number;
  improvementTrend: number;
  recommendations: string[];
}

export interface PortfolioAnalytics {
  currentValue: number;
  totalReturn: number;
  dailyReturns: number[];
  monthlyReturns: number[];
  drawdownSeries: number[];
  allocationHistory: Array<{
    date: Date;
    allocations: Record<string, number>;
  }>;
  riskMetrics: {
    volatility: number;
    skewness: number;
    kurtosis: number;
    correlations: Record<string, number>;
  };
  performanceAttribution: {
    byAsset: Record<string, number>;
    byProtocol: Record<string, number>;
    byStrategy: Record<string, number>;
  };
}

@Injectable()
export class PerformanceTrackingService {
  private readonly logger = new Logger(PerformanceTrackingService.name);

  // Benchmark data (in production, fetch from external sources)
  private readonly BENCHMARKS = {
    'DeFi Pulse Index': 0.125, // 12.5% annual return
    ETH: 0.089, // 8.9% annual return
    BTC: 0.156, // 15.6% annual return
    'Traditional 60/40': 0.078, // 7.8% annual return
  };

  constructor(
    @InjectModel(UserPortfolio.name)
    private userPortfolioModel: Model<UserPortfolioDocument>,
    @InjectModel(AIDecisionLog.name)
    private aiDecisionLogModel: Model<AIDecisionLogDocument>,
  ) {}

  async generatePerformanceReport(
    userId: string,
    timeframe: string = '30d',
  ): Promise<PortfolioPerformanceDto> {
    this.logger.log(
      `Generating comprehensive performance report for ${userId} (${timeframe})`,
    );

    try {
      // Get user portfolio and decision history
      const portfolio = await this.getUserPortfolio(userId);
      const decisions = await this.getAIDecisions(userId, timeframe);
      const analytics = await this.calculatePortfolioAnalytics(
        portfolio,
        timeframe,
      );

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(
        analytics.dailyReturns,
        analytics.currentValue,
      );

      // Calculate AI decision accuracy
      const aiMetrics = await this.calculateAIAccuracyMetrics(decisions);

      // Calculate risk metrics
      const riskMetrics = this.calculateRiskMetrics(
        analytics.dailyReturns,
        analytics.riskMetrics,
      );

      // Calculate benchmark comparison
      const benchmarkComparison = this.calculateBenchmarkComparison(
        performanceMetrics.totalReturn,
        performanceMetrics.volatility,
        timeframe,
      );

      // Calculate performance attribution
      const attribution = this.calculatePerformanceAttribution(
        analytics.performanceAttribution,
      );

      return {
        userId,
        timeframe,
        currentValue: analytics.currentValue,
        totalReturn: performanceMetrics.totalReturn,
        annualizedReturn: performanceMetrics.annualizedReturn,
        volatility: performanceMetrics.volatility,
        sharpeRatio: performanceMetrics.sharpeRatio,
        maxDrawdown: performanceMetrics.maxDrawdown,
        winRate: performanceMetrics.winRate,
        profitFactor: performanceMetrics.profitFactor,
        benchmarkComparison,
        aiDecisionMetrics: {
          totalDecisions: aiMetrics.totalDecisions,
          accurateDecisions: aiMetrics.accurateDecisions,
          accuracyRate: aiMetrics.accuracyRate,
          averageConfidence: aiMetrics.averageConfidence,
        },
        riskMetrics,
        attribution,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate performance report for ${userId}: ${error.message}`,
      );
      throw new Error(`Performance report generation failed: ${error.message}`);
    }
  }

  async trackAIDecisionAccuracy(): Promise<AIAccuracyMetrics> {
    this.logger.log('Calculating comprehensive AI decision accuracy metrics');

    try {
      const recentDecisions = await this.aiDecisionLogModel
        .find({
          decisionTimestamp: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          }, // Last 30 days
          profitabilityActual: { $exists: true },
        })
        .exec();

      if (recentDecisions.length === 0) {
        return this.getDefaultAccuracyMetrics();
      }

      // Calculate overall accuracy
      const accurateDecisions = recentDecisions.filter(
        (decision) =>
          (decision.profitabilityActual || 0) >=
          decision.profitabilityPredicted * 0.9, // Within 10%
      );
      const overallAccuracy = accurateDecisions.length / recentDecisions.length;

      // Calculate accuracy by confidence level
      const accuracyByConfidence =
        this.calculateAccuracyByConfidence(recentDecisions);

      // Calculate accuracy by timeframe
      const accuracyByTimeframe =
        this.calculateAccuracyByTimeframe(recentDecisions);

      // Calculate accuracy by market condition
      const accuracyByMarketCondition =
        this.calculateAccuracyByMarketCondition(recentDecisions);

      // Calculate prediction bias
      const predictionBias = this.calculatePredictionBias(recentDecisions);

      // Calculate calibration score
      const calibrationScore = this.calculateCalibrationScore(recentDecisions);

      // Calculate improvement trend
      const improvementTrend = this.calculateImprovementTrend(recentDecisions);

      // Generate recommendations
      const recommendations = this.generateAccuracyRecommendations({
        overallAccuracy,
        predictionBias,
        calibrationScore,
        improvementTrend,
      });

      return {
        overallAccuracy,
        accuracyByConfidenceLevel: accuracyByConfidence,
        accuracyByTimeframe,
        accuracyByMarketCondition,
        predictionBias,
        calibrationScore,
        improvementTrend,
        recommendations,
      };
    } catch (error) {
      this.logger.error(
        `Failed to track AI decision accuracy: ${error.message}`,
      );
      return this.getDefaultAccuracyMetrics();
    }
  }

  async getPortfolioAnalytics(
    userId: string,
    timeframe: string = '30d',
  ): Promise<PortfolioAnalytics> {
    this.logger.log(`Getting portfolio analytics for ${userId} (${timeframe})`);

    try {
      const portfolio = await this.getUserPortfolio(userId);
      return await this.calculatePortfolioAnalytics(portfolio, timeframe);
    } catch (error) {
      this.logger.error(`Failed to get portfolio analytics: ${error.message}`);
      throw error;
    }
  }

  async updatePortfolioPerformance(
    userId: string,
    newValue: number,
    allocations: Record<string, number>,
  ): Promise<void> {
    this.logger.log(`Updating portfolio performance for ${userId}`);

    try {
      await this.userPortfolioModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            totalValue: newValue,
            lastUpdated: new Date(),
          },
          $push: {
            performanceHistory: {
              timestamp: new Date(),
              totalValue: newValue,
              allocations,
            },
          },
        },
        { upsert: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update portfolio performance: ${error.message}`,
      );
    }
  }

  private async getUserPortfolio(
    userId: string,
  ): Promise<UserPortfolioDocument> {
    const portfolio = await this.userPortfolioModel.findOne({ userId }).exec();
    if (!portfolio) {
      throw new Error(`Portfolio not found for user ${userId}`);
    }
    return portfolio;
  }

  private async getAIDecisions(
    userId: string,
    timeframe: string,
  ): Promise<AIDecisionLogDocument[]> {
    const days = this.parseTimeframeToDays(timeframe);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await this.aiDecisionLogModel
      .find({
        userId,
        decisionTimestamp: { $gte: startDate },
      })
      .sort({ decisionTimestamp: -1 })
      .exec();
  }

  private async calculatePortfolioAnalytics(
    portfolio: UserPortfolioDocument,
    timeframe: string,
  ): Promise<PortfolioAnalytics> {
    // Generate mock analytics - in production, calculate from actual data
    const days = this.parseTimeframeToDays(timeframe);
    const dailyReturns = this.generateMockDailyReturns(days);
    const monthlyReturns = this.aggregateToMonthlyReturns(dailyReturns);
    const drawdownSeries = this.calculateDrawdownSeries(dailyReturns);

    return {
      currentValue: portfolio.totalValue || 0,
      totalReturn: dailyReturns.reduce((sum, ret) => sum + ret, 0),
      dailyReturns,
      monthlyReturns,
      drawdownSeries,
      allocationHistory: [
        {
          date: new Date(),
          allocations: portfolio.positions.reduce(
            (acc, pos) => {
              acc[pos.symbol] =
                parseFloat(pos.amount.toString()) / Math.pow(10, 18);
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
      ],
      riskMetrics: {
        volatility: this.calculateVolatility(dailyReturns),
        skewness: this.calculateSkewness(dailyReturns),
        kurtosis: this.calculateKurtosis(dailyReturns),
        correlations: {
          ETH: 0.75,
          BTC: 0.65,
          DeFi: 0.85,
        },
      },
      performanceAttribution: {
        byAsset: portfolio.positions.reduce(
          (acc, pos) => {
            acc[pos.symbol] = Math.random() * 0.1 - 0.05; // -5% to +5%
            return acc;
          },
          {} as Record<string, number>,
        ),
        byProtocol: {
          'Aave V3': 0.03,
          Compound: 0.02,
          Yearn: 0.04,
        },
        byStrategy: {
          'Yield Optimization': 0.05,
          'Risk Management': -0.01,
          Rebalancing: 0.02,
        },
      },
    };
  }

  private calculatePerformanceMetrics(
    dailyReturns: number[],
    currentValue: number,
  ) {
    const totalReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0);
    const annualizedReturn = this.annualizeReturn(
      totalReturn,
      dailyReturns.length,
    );
    const volatility = this.calculateVolatility(dailyReturns);
    const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility);
    const maxDrawdown = this.calculateMaxDrawdown(dailyReturns);
    const winRate = this.calculateWinRate(dailyReturns);
    const profitFactor = this.calculateProfitFactor(dailyReturns);

    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      winRate,
      profitFactor,
    };
  }

  private async calculateAIAccuracyMetrics(decisions: AIDecisionLogDocument[]) {
    if (decisions.length === 0) {
      return {
        totalDecisions: 0,
        accurateDecisions: 0,
        accuracyRate: 0,
        averageConfidence: 0,
      };
    }

    const accurateDecisions = decisions.filter(
      (d) => (d.profitabilityActual || 0) >= d.profitabilityPredicted * 0.9,
    );

    return {
      totalDecisions: decisions.length,
      accurateDecisions: accurateDecisions.length,
      accuracyRate: accurateDecisions.length / decisions.length,
      averageConfidence:
        decisions.reduce((sum, d) => sum + (d.aiAnalysis?.confidence || 0), 0) /
        decisions.length,
    };
  }

  private calculateRiskMetrics(dailyReturns: number[], riskMetrics: any) {
    const volatility = this.calculateVolatility(dailyReturns);
    const valueAtRisk = this.calculateVaR(dailyReturns, 0.05); // 5% VaR
    const conditionalVaR = this.calculateCVaR(dailyReturns, 0.05);

    return {
      volatility,
      valueAtRisk,
      conditionalVaR,
      beta: riskMetrics.correlations?.ETH * (volatility / 0.6) || 1.0, // Assuming ETH vol of 60%
      alpha: 0.02, // Mock alpha
      informationRatio: 0.5, // Mock information ratio
    };
  }

  private calculateBenchmarkComparison(
    totalReturn: number,
    volatility: number,
    timeframe: string,
  ) {
    const benchmarkReturn = this.BENCHMARKS['DeFi Pulse Index'];
    const benchmarkVolatility = 0.45; // 45% annual volatility for DeFi

    const outperformance = totalReturn - benchmarkReturn;
    const sharpeRatio = (totalReturn - 0.04) / volatility; // Risk-free rate 4%
    const benchmarkSharpe = (benchmarkReturn - 0.04) / benchmarkVolatility;

    return {
      benchmark: 'DeFi Pulse Index',
      outperformance,
      relativeSharpe: sharpeRatio / benchmarkSharpe,
      correlation: 0.75, // Mock correlation
    };
  }

  private calculatePerformanceAttribution(attribution: any) {
    return {
      assetAllocation: 0.03, // 3% from asset allocation
      securitySelection: 0.02, // 2% from security selection
      timing: 0.01, // 1% from timing
      interaction: 0.005, // 0.5% from interaction effects
    };
  }

  // Helper methods for statistical calculations
  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      (returns.length - 1);
    return Math.sqrt(variance * 252); // Annualized
  }

  private calculateSharpeRatio(
    annualizedReturn: number,
    volatility: number,
  ): number {
    const riskFreeRate = 0.04; // 4%
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const ret of returns) {
      cumulative += ret;
      peak = Math.max(peak, cumulative);
      const drawdown = (peak - cumulative) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateWinRate(returns: number[]): number {
    const positiveReturns = returns.filter((ret) => ret > 0);
    return positiveReturns.length / returns.length;
  }

  private calculateProfitFactor(returns: number[]): number {
    const gains = returns
      .filter((ret) => ret > 0)
      .reduce((sum, ret) => sum + ret, 0);
    const losses = Math.abs(
      returns.filter((ret) => ret < 0).reduce((sum, ret) => sum + ret, 0),
    );
    return losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;
  }

  private calculateVaR(returns: number[], confidence: number): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidence);
    return sorted[index] || 0;
  }

  private calculateCVaR(returns: number[], confidence: number): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidence);
    const tailReturns = sorted.slice(0, index);
    return tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
  }

  private calculateSkewness(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      returns.length;
    const skewness =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 3), 0) /
      (returns.length * Math.pow(variance, 1.5));
    return skewness;
  }

  private calculateKurtosis(returns: number[]): number {
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      returns.length;
    const kurtosis =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 4), 0) /
        (returns.length * Math.pow(variance, 2)) -
      3;
    return kurtosis;
  }

  private annualizeReturn(totalReturn: number, days: number): number {
    return Math.pow(1 + totalReturn, 365 / days) - 1;
  }

  private parseTimeframeToDays(timeframe: string): number {
    const timeframeMap: Record<string, number> = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      all: 365,
    };
    return timeframeMap[timeframe] || 30;
  }

  private generateMockDailyReturns(days: number): number[] {
    const returns: number[] = [];
    for (let i = 0; i < days; i++) {
      // Generate realistic daily returns with some volatility
      returns.push((Math.random() - 0.5) * 0.1); // -5% to +5% daily
    }
    return returns;
  }

  private aggregateToMonthlyReturns(dailyReturns: number[]): number[] {
    const monthlyReturns: number[] = [];
    for (let i = 0; i < dailyReturns.length; i += 30) {
      const monthReturns = dailyReturns.slice(i, i + 30);
      const monthlyReturn = monthReturns.reduce((sum, ret) => sum + ret, 0);
      monthlyReturns.push(monthlyReturn);
    }
    return monthlyReturns;
  }

  private calculateDrawdownSeries(returns: number[]): number[] {
    const drawdowns: number[] = [];
    let peak = 0;
    let cumulative = 0;

    for (const ret of returns) {
      cumulative += ret;
      peak = Math.max(peak, cumulative);
      const drawdown = peak > 0 ? (peak - cumulative) / peak : 0;
      drawdowns.push(drawdown);
    }

    return drawdowns;
  }

  // AI Accuracy calculation methods
  private calculateAccuracyByConfidence(
    decisions: AIDecisionLogDocument[],
  ): Record<string, number> {
    const confidenceBuckets = {
      'Low (0-30%)': [0, 30],
      'Medium (30-70%)': [30, 70],
      'High (70-100%)': [70, 100],
    };

    const result: Record<string, number> = {};

    for (const [bucket, [min, max]] of Object.entries(confidenceBuckets)) {
      const bucketDecisions = decisions.filter(
        (d) =>
          (d.aiAnalysis?.confidence || 0) >= min &&
          (d.aiAnalysis?.confidence || 0) < max,
      );
      if (bucketDecisions.length > 0) {
        const accurate = bucketDecisions.filter(
          (d) =>
            (d.performanceOutcome?.actualAPY || d.profitabilityActual || 0) >=
            (d.aiAnalysis?.expectedAPY || d.profitabilityPredicted) * 0.9,
        );
        result[bucket] = accurate.length / bucketDecisions.length;
      } else {
        result[bucket] = 0;
      }
    }

    return result;
  }

  private calculateAccuracyByTimeframe(
    decisions: AIDecisionLogDocument[],
  ): Record<string, number> {
    const now = Date.now();
    const timeframes = {
      'Last 7 days': 7 * 24 * 60 * 60 * 1000,
      'Last 30 days': 30 * 24 * 60 * 60 * 1000,
      'Last 90 days': 90 * 24 * 60 * 60 * 1000,
    };

    const result: Record<string, number> = {};

    for (const [timeframe, duration] of Object.entries(timeframes)) {
      const timeframeDecisions = decisions.filter(
        (d) => now - d.decisionTimestamp.getTime() <= duration,
      );
      if (timeframeDecisions.length > 0) {
        const accurate = timeframeDecisions.filter(
          (d) =>
            (d.performanceOutcome?.actualAPY || d.profitabilityActual || 0) >=
            (d.aiAnalysis?.expectedAPY || d.profitabilityPredicted) * 0.9,
        );
        result[timeframe] = accurate.length / timeframeDecisions.length;
      } else {
        result[timeframe] = 0;
      }
    }

    return result;
  }

  private calculateAccuracyByMarketCondition(
    decisions: AIDecisionLogDocument[],
  ): Record<string, number> {
    // Mock market condition classification
    return {
      'Bull Market': 0.85,
      'Bear Market': 0.72,
      'Sideways Market': 0.78,
      'High Volatility': 0.68,
      'Low Volatility': 0.82,
    };
  }

  private calculatePredictionBias(decisions: AIDecisionLogDocument[]): number {
    if (decisions.length === 0) return 0;

    const biases = decisions.map(
      (d) => d.profitabilityPredicted - (d.profitabilityActual || 0),
    );
    return biases.reduce((sum, bias) => sum + bias, 0) / biases.length;
  }

  private calculateCalibrationScore(
    decisions: AIDecisionLogDocument[],
  ): number {
    // Simplified calibration score - measures how well confidence matches accuracy
    const confidenceBuckets = [0, 20, 40, 60, 80, 100];
    let totalCalibrationError = 0;
    let totalDecisions = 0;

    for (let i = 0; i < confidenceBuckets.length - 1; i++) {
      const min = confidenceBuckets[i];
      const max = confidenceBuckets[i + 1];
      const bucketDecisions = decisions.filter(
        (d) =>
          (d.aiAnalysis?.confidence || 0) >= min &&
          (d.aiAnalysis?.confidence || 0) < max,
      );

      if (bucketDecisions.length > 0) {
        const avgConfidence =
          bucketDecisions.reduce(
            (sum, d) => sum + (d.aiAnalysis?.confidence || 0),
            0,
          ) / bucketDecisions.length;
        const accuracy =
          bucketDecisions.filter(
            (d) =>
              (d.performanceOutcome?.actualAPY || d.profitabilityActual || 0) >=
              (d.aiAnalysis?.expectedAPY || d.profitabilityPredicted) * 0.9,
          ).length / bucketDecisions.length;

        totalCalibrationError += Math.abs(avgConfidence / 100 - accuracy);
        totalDecisions += bucketDecisions.length;
      }
    }

    return totalDecisions > 0 ? 1 - totalCalibrationError / 5 : 0; // Normalize to 0-1
  }

  private calculateImprovementTrend(
    decisions: AIDecisionLogDocument[],
  ): number {
    if (decisions.length < 10) return 0;

    // Sort by timestamp
    const sortedDecisions = decisions.sort(
      (a, b) => a.decisionTimestamp.getTime() - b.decisionTimestamp.getTime(),
    );

    // Calculate accuracy for first and second half
    const midpoint = Math.floor(sortedDecisions.length / 2);
    const firstHalf = sortedDecisions.slice(0, midpoint);
    const secondHalf = sortedDecisions.slice(midpoint);

    const firstHalfAccuracy =
      firstHalf.filter(
        (d) =>
          (d.performanceOutcome?.actualAPY || d.profitabilityActual || 0) >=
          (d.aiAnalysis?.expectedAPY || d.profitabilityPredicted) * 0.9,
      ).length / firstHalf.length;
    const secondHalfAccuracy =
      secondHalf.filter(
        (d) =>
          (d.performanceOutcome?.actualAPY || d.profitabilityActual || 0) >=
          (d.aiAnalysis?.expectedAPY || d.profitabilityPredicted) * 0.9,
      ).length / secondHalf.length;

    return secondHalfAccuracy - firstHalfAccuracy;
  }

  private generateAccuracyRecommendations(metrics: {
    overallAccuracy: number;
    predictionBias: number;
    calibrationScore: number;
    improvementTrend: number;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.overallAccuracy < 0.7) {
      recommendations.push(
        'Overall accuracy is below 70%. Consider reviewing prediction models.',
      );
    }

    if (Math.abs(metrics.predictionBias) > 0.05) {
      recommendations.push(
        metrics.predictionBias > 0
          ? 'Model shows optimistic bias. Consider adjusting prediction algorithms.'
          : 'Model shows pessimistic bias. Consider adjusting prediction algorithms.',
      );
    }

    if (metrics.calibrationScore < 0.8) {
      recommendations.push(
        'Confidence calibration needs improvement. Review confidence scoring methodology.',
      );
    }

    if (metrics.improvementTrend < 0) {
      recommendations.push(
        'Accuracy is declining over time. Investigate model degradation.',
      );
    } else if (metrics.improvementTrend > 0.1) {
      recommendations.push(
        'Accuracy is improving. Current learning approach is effective.',
      );
    }

    return recommendations;
  }

  private getDefaultAccuracyMetrics(): AIAccuracyMetrics {
    return {
      overallAccuracy: 0,
      accuracyByConfidenceLevel: {},
      accuracyByTimeframe: {},
      accuracyByMarketCondition: {},
      predictionBias: 0,
      calibrationScore: 0,
      improvementTrend: 0,
      recommendations: ['Insufficient data for accuracy analysis'],
    };
  }
}
