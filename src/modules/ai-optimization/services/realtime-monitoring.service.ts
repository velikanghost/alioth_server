import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Interval } from '@nestjs/schedule';
import {
  UserPortfolio,
  UserPortfolioDocument,
} from '../schemas/user-portfolio.schema';
import {
  AIDecisionLog,
  AIDecisionLogDocument,
} from '../schemas/ai-decision-log.schema';

export interface PortfolioUpdate {
  userId: string;
  portfolioValue: number;
  totalValue: number;
  pnl24h: number;
  pnlPercentage: number;
  allocations: {
    token: string;
    symbol: string;
    value: number;
    percentage: number;
    change24h: number;
  }[];
  lastUpdated: Date;
}

export interface RebalanceOpportunity {
  userId: string;
  portfolioId: string;
  currentAllocations: any[];
  suggestedAllocations: any[];
  expectedImprovement: number;
  risk: number;
  reason: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedGasCost: number;
}

export interface MarketAlert {
  type:
    | 'PRICE_CHANGE'
    | 'YIELD_OPPORTUNITY'
    | 'RISK_WARNING'
    | 'REBALANCE_SUGGESTED';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  token?: string;
  message: string;
  data: any;
  timestamp: Date;
}

export interface PerformanceMetrics {
  totalPortfolios: number;
  totalValue: number;
  averagePerformance: number;
  activeUsers: number;
  rebalanceOpportunities: number;
  averageGasUsage: number;
  uptime: number;
  alertsLast24h: number;
}

@Injectable()
export class RealtimeMonitoringService {
  private readonly logger = new Logger(RealtimeMonitoringService.name);

  // WebSocket connections (in production, use Redis for scalability)
  private readonly connections: Map<string, any> = new Map();

  // Market alerts queue
  private readonly alertsQueue: MarketAlert[] = [];

  // Rebalance opportunities cache
  private readonly rebalanceOpportunities: Map<string, RebalanceOpportunity[]> =
    new Map();

  // Performance metrics
  private performanceMetrics: PerformanceMetrics = {
    totalPortfolios: 0,
    totalValue: 0,
    averagePerformance: 0,
    activeUsers: 0,
    rebalanceOpportunities: 0,
    averageGasUsage: 0,
    uptime: 100,
    alertsLast24h: 0,
  };

  constructor(
    @InjectModel(UserPortfolio.name)
    private userPortfolioModel: Model<UserPortfolioDocument>,
    @InjectModel(AIDecisionLog.name)
    private aiDecisionLogModel: Model<AIDecisionLogDocument>,
    private configService: ConfigService,
  ) {}

  // Real-time portfolio monitoring
  @Interval(30000) // Every 30 seconds
  async monitorPortfolios(): Promise<void> {
    this.logger.log('Running portfolio monitoring cycle');

    try {
      const portfolios = await this.userPortfolioModel
        .find({ isActive: true })
        .exec();

      for (const portfolio of portfolios) {
        const update = await this.calculatePortfolioUpdate(portfolio);
        await this.broadcastPortfolioUpdate(update);

        // Check for rebalance opportunities
        const opportunities = await this.checkRebalanceOpportunities(portfolio);
        if (opportunities.length > 0) {
          this.rebalanceOpportunities.set(portfolio.userId, opportunities);
          await this.notifyRebalanceOpportunities(
            portfolio.userId,
            opportunities,
          );
        }
      }

      // Update performance metrics
      await this.updatePerformanceMetrics();
    } catch (error) {
      this.logger.error(`Portfolio monitoring failed: ${error.message}`);
    }
  }

  // Market monitoring for alerts
  @Interval(60000) // Every minute
  async monitorMarketConditions(): Promise<void> {
    this.logger.log('Monitoring market conditions for alerts');

    try {
      // Check for significant price movements
      await this.checkPriceMovements();

      // Check for new yield opportunities
      await this.checkYieldOpportunities();

      // Check for risk warnings
      await this.checkRiskWarnings();

      // Process alert queue
      await this.processAlertQueue();
    } catch (error) {
      this.logger.error(`Market monitoring failed: ${error.message}`);
    }
  }

  // Register WebSocket connection
  registerConnection(userId: string, connection: any): void {
    this.logger.log(`Registering WebSocket connection for user: ${userId}`);
    this.connections.set(userId, connection);
  }

  // Unregister WebSocket connection
  unregisterConnection(userId: string): void {
    this.logger.log(`Unregistering WebSocket connection for user: ${userId}`);
    this.connections.delete(userId);
  }

  // Broadcast portfolio update to user
  async broadcastPortfolioUpdate(update: PortfolioUpdate): Promise<void> {
    const connection = this.connections.get(update.userId);
    if (connection) {
      try {
        connection.emit('portfolio-update', update);
        this.logger.log(
          `Portfolio update broadcasted to user: ${update.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to broadcast portfolio update: ${error.message}`,
        );
      }
    }
  }

  // Broadcast market alert
  async broadcastMarketAlert(alert: MarketAlert): Promise<void> {
    // Broadcast to all connected users
    for (const [userId, connection] of this.connections.entries()) {
      try {
        connection.emit('market-alert', alert);
      } catch (error) {
        this.logger.error(
          `Failed to broadcast alert to user ${userId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Market alert broadcasted: ${alert.type} - ${alert.message}`,
    );
  }

  // Get real-time performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Get user's rebalance opportunities
  getRebalanceOpportunities(userId: string): RebalanceOpportunity[] {
    return this.rebalanceOpportunities.get(userId) || [];
  }

  // Get recent alerts
  getRecentAlerts(limit: number = 50): MarketAlert[] {
    return this.alertsQueue.slice(-limit);
  }

  private async calculatePortfolioUpdate(
    portfolio: UserPortfolioDocument,
  ): Promise<PortfolioUpdate> {
    // Mock portfolio value calculation - in production, use real-time prices
    const mockPrices: Record<string, number> = {
      AAVE: 85.5,
      WETH: 2300.0,
      WBTC: 42000.0,
      LINK: 12.5,
    };

    let totalValue = 0;
    const allocations = [];

    for (const position of portfolio.positions) {
      const price = mockPrices[position.token] || 1;
      const value =
        (parseFloat(position.amount.toString()) * price) / Math.pow(10, 18); // Assume 18 decimals
      const change24h = (Math.random() - 0.5) * 0.1; // Random -5% to +5%

      totalValue += value;
      allocations.push({
        token: position.token,
        symbol: position.symbol,
        value,
        percentage: 0, // Will be calculated after total
        change24h,
      });
    }

    // Calculate percentages
    allocations.forEach((allocation) => {
      allocation.percentage =
        totalValue > 0 ? (allocation.value / totalValue) * 100 : 0;
    });

    // Calculate P&L
    const previousValue = portfolio.totalValue || totalValue;
    const pnl24h = totalValue - previousValue;
    const pnlPercentage =
      previousValue > 0 ? (pnl24h / previousValue) * 100 : 0;

    return {
      userId: portfolio.userId,
      portfolioValue: totalValue,
      totalValue,
      pnl24h,
      pnlPercentage,
      allocations,
      lastUpdated: new Date(),
    };
  }

  private async checkRebalanceOpportunities(
    portfolio: UserPortfolioDocument,
  ): Promise<RebalanceOpportunity[]> {
    const opportunities: RebalanceOpportunity[] = [];

    // Simple rebalance logic - check if any position is > 50% of portfolio
    const totalValue = portfolio.totalValue || 0;

    for (const position of portfolio.positions) {
      const positionValue =
        parseFloat(position.amount.toString()) / Math.pow(10, 18);
      const percentage =
        totalValue > 0 ? (positionValue / totalValue) * 100 : 0;

      if (percentage > 50) {
        opportunities.push({
          userId: portfolio.userId,
          portfolioId: (portfolio._id as any).toString(),
          currentAllocations: portfolio.positions.map((p) => ({
            token: p.token,
            symbol: p.symbol,
            percentage:
              totalValue > 0
                ? (parseFloat(p.amount.toString()) /
                    Math.pow(10, 18) /
                    totalValue) *
                  100
                : 0,
          })),
          suggestedAllocations: [
            { token: position.token, symbol: position.symbol, percentage: 40 },
            // Other allocations would be calculated here
          ],
          expectedImprovement: 0.02, // 2% expected improvement
          risk: 3, // Medium risk
          reason: `Over-concentration in ${position.symbol} (${percentage.toFixed(1)}%)`,
          urgency: percentage > 70 ? 'HIGH' : 'MEDIUM',
          estimatedGasCost: 0.02, // $20 in ETH
        });
      }
    }

    return opportunities;
  }

  private async notifyRebalanceOpportunities(
    userId: string,
    opportunities: RebalanceOpportunity[],
  ): Promise<void> {
    for (const opportunity of opportunities) {
      const alert: MarketAlert = {
        type: 'REBALANCE_SUGGESTED',
        severity: opportunity.urgency === 'HIGH' ? 'WARNING' : 'INFO',
        message: opportunity.reason,
        data: opportunity,
        timestamp: new Date(),
      };

      await this.broadcastUserAlert(userId, alert);
    }
  }

  private async broadcastUserAlert(
    userId: string,
    alert: MarketAlert,
  ): Promise<void> {
    const connection = this.connections.get(userId);
    if (connection) {
      try {
        connection.emit('user-alert', alert);
      } catch (error) {
        this.logger.error(`Failed to broadcast user alert: ${error.message}`);
      }
    }
  }

  private async checkPriceMovements(): Promise<void> {
    // Mock price movement detection
    const priceChanges = [
      { token: 'AAVE', change: 0.08, price: 92.34 },
      { token: 'WETH', change: -0.03, price: 2231.0 },
    ];

    for (const change of priceChanges) {
      if (Math.abs(change.change) > 0.05) {
        // > 5% change
        const alert: MarketAlert = {
          type: 'PRICE_CHANGE',
          severity: Math.abs(change.change) > 0.1 ? 'WARNING' : 'INFO',
          token: change.token,
          message: `${change.token} price ${change.change > 0 ? 'increased' : 'decreased'} by ${(Math.abs(change.change) * 100).toFixed(1)}%`,
          data: {
            token: change.token,
            priceChange: change.change,
            currentPrice: change.price,
          },
          timestamp: new Date(),
        };

        this.alertsQueue.push(alert);
      }
    }
  }

  private async checkYieldOpportunities(): Promise<void> {
    // Mock yield opportunity detection
    const newOpportunity = {
      protocol: 'Aave V3',
      token: 'WETH',
      apy: 0.055, // 5.5%
      previousApy: 0.025, // 2.5%
    };

    if (newOpportunity.apy > newOpportunity.previousApy * 1.5) {
      // 50% increase
      const alert: MarketAlert = {
        type: 'YIELD_OPPORTUNITY',
        severity: 'INFO',
        token: newOpportunity.token,
        message: `New high yield opportunity: ${newOpportunity.token} on ${newOpportunity.protocol} now at ${(newOpportunity.apy * 100).toFixed(1)}% APY`,
        data: newOpportunity,
        timestamp: new Date(),
      };

      this.alertsQueue.push(alert);
    }
  }

  private async checkRiskWarnings(): Promise<void> {
    // Mock risk warning detection
    const riskEvents = [
      {
        type: 'high_volatility',
        token: 'AAVE',
        volatility: 0.25, // 25%
        threshold: 0.2, // 20%
      },
    ];

    for (const event of riskEvents) {
      if (event.volatility > event.threshold) {
        const alert: MarketAlert = {
          type: 'RISK_WARNING',
          severity: 'WARNING',
          token: event.token,
          message: `High volatility detected for ${event.token}: ${(event.volatility * 100).toFixed(1)}%`,
          data: event,
          timestamp: new Date(),
        };

        this.alertsQueue.push(alert);
      }
    }
  }

  private async processAlertQueue(): Promise<void> {
    const alertsToProcess = this.alertsQueue.splice(0, 10); // Process up to 10 alerts at once

    for (const alert of alertsToProcess) {
      await this.broadcastMarketAlert(alert);

      // Keep recent alerts in memory
      if (this.alertsQueue.length > 1000) {
        this.alertsQueue.shift(); // Remove oldest alert
      }
    }
  }

  private async updatePerformanceMetrics(): Promise<void> {
    try {
      const portfolios = await this.userPortfolioModel
        .find({ isActive: true })
        .exec();
      const recentDecisions = await this.aiDecisionLogModel
        .find({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        })
        .exec();

      this.performanceMetrics = {
        totalPortfolios: portfolios.length,
        totalValue: portfolios.reduce((sum, p) => sum + (p.totalValue || 0), 0),
        averagePerformance:
          portfolios.length > 0
            ? portfolios.reduce((sum, p) => sum + (p.performance24h || 0), 0) /
              portfolios.length
            : 0,
        activeUsers: new Set(portfolios.map((p) => p.userId)).size,
        rebalanceOpportunities: Array.from(
          this.rebalanceOpportunities.values(),
        ).flat().length,
        averageGasUsage:
          recentDecisions.length > 0
            ? recentDecisions.reduce((sum, d) => sum + (d.gasUsed || 0), 0) /
              recentDecisions.length
            : 0,
        uptime: 99.8, // Mock uptime
        alertsLast24h: this.alertsQueue.filter(
          (a) => Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000,
        ).length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update performance metrics: ${error.message}`,
      );
    }
  }

  // Emergency monitoring
  async checkSystemHealth(): Promise<{
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    issues: string[];
    uptime: number;
    lastCheck: Date;
  }> {
    const issues: string[] = [];
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    // Check database connectivity
    try {
      await this.userPortfolioModel.findOne().exec();
    } catch (error) {
      issues.push('Database connectivity issues');
      status = 'CRITICAL';
    }

    // Check WebSocket connections
    const connectionCount = this.connections.size;
    if (connectionCount === 0 && this.performanceMetrics.activeUsers > 0) {
      issues.push('No active WebSocket connections');
      status = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    }

    // Check alert processing
    if (this.alertsQueue.length > 100) {
      issues.push('Alert queue backlog detected');
      status = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
    }

    return {
      status,
      issues,
      uptime: this.performanceMetrics.uptime,
      lastCheck: new Date(),
    };
  }
}
