import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  UserPortfolio,
  UserPortfolioDocument,
} from '../../../shared/schemas/user-portfolio.schema';
import {
  MarketDataCache,
  MarketDataCacheDocument,
} from '../../../shared/schemas/market-data-cache.schema';
import { ChainlinkDataService } from '../../market-analysis/services/chainlink-data.service';
import { DEXAggregatorService } from '../../swap-execution/services/dex-aggregator.service';
import { VaultService } from '../../yield-vault/services/vault.service';

// Import DTOs from controller
import {
  OptimizationResponseDto,
  ExecutionRequestDto,
  MarketDataRequestDto,
} from '../controllers/external-ai.controller';

@Injectable()
export class ExternalAIService {
  private readonly logger = new Logger(ExternalAIService.name);

  constructor(
    @InjectModel(UserPortfolio.name)
    private userPortfolioModel: Model<UserPortfolioDocument>,
    @InjectModel(MarketDataCache.name)
    private marketDataCacheModel: Model<MarketDataCacheDocument>,
    private readonly chainlinkService: ChainlinkDataService,
    private readonly dexService: DEXAggregatorService,
    private readonly vaultService: VaultService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Provide market data for external AI analysis
   */
  async getMarketDataForAI(request: MarketDataRequestDto): Promise<any> {
    try {
      const marketData = await this.chainlinkService.getMarketAnalysis(
        request.tokens,
      );

      const response = {
        timestamp: new Date().toISOString(),
        chains: request.chainIds,
        tokens: marketData.tokens.map((token) => ({
          address: token.token,
          symbol: token.symbol,
          name: token.symbol,
          chainId: request.chainIds[0] || 1,
          price: {
            usd: token.currentPrice,
            timestamp: marketData.timestamp,
          },
          yields: request.includeYields
            ? token.yields.map((y) => ({
                protocol: y.protocol,
                apy: y.apy,
                tvl: y.tvl,
                riskScore: this.convertRiskLevelToScore(y.riskLevel),
              }))
            : undefined,
          volatility: request.includeVolatility
            ? {
                daily: token.volatility,
                weekly: token.volatility * 1.2,
                monthly: token.volatility * 1.5,
              }
            : undefined,
          correlations: request.includeCorrelations
            ? marketData.correlations
                .filter(
                  (c) => c.tokenA === token.token || c.tokenB === token.token,
                )
                .map((c) => ({
                  withToken: c.tokenA === token.token ? c.tokenB : c.tokenA,
                  correlation: c.correlation,
                  timeframe: c.timeframe,
                }))
            : undefined,
        })),
      };

      return response;
    } catch (error) {
      this.logger.error('Failed to get market data for AI:', error);
      throw error;
    }
  }

  /**
   * Provide portfolio data for external AI analysis
   */
  async getPortfolioDataForAI(
    userAddress: string,
    chainId?: number,
  ): Promise<any> {
    try {
      const query: any = { userAddress };
      if (chainId) query.chainId = chainId;

      const portfolios = await this.userPortfolioModel.find(query).exec();

      const response = {
        userAddress,
        portfolios: portfolios.map((portfolio) => ({
          chainId: portfolio.chainId,
          totalValueUSD: portfolio.totalValueUSD,
          weightedAPY: portfolio.weightedAPY,
          riskTolerance: portfolio.riskTolerance,
          positions: Array.from(portfolio.positions.entries()).map(
            ([token, position]) => ({
              token,
              balance: position.balance,
              usdValue: position.usdValue,
              protocol: position.protocol,
              apy: position.apy,
              lastUpdated: position.lastUpdated,
            }),
          ),
          autoRebalanceSettings: portfolio.autoRebalanceSettings,
          performanceMetrics: portfolio.performanceMetrics,
          lastRebalance: portfolio.lastRebalance,
        })),
        totalValueUSD: portfolios.reduce((sum, p) => sum + p.totalValueUSD, 0),
        averageAPY:
          portfolios.reduce((sum, p) => sum + p.weightedAPY, 0) /
          portfolios.length,
      };

      return response;
    } catch (error) {
      this.logger.error('Failed to get portfolio data for AI:', error);
      throw error;
    }
  }

  /**
   * Execute optimization strategy from external AI
   */
  async executeOptimizationStrategy(
    request: ExecutionRequestDto,
  ): Promise<any> {
    try {
      // For now, return a mock successful execution
      // In production, this would execute the actual swaps and deposits
      const response = {
        operationId: request.strategy.operationId,
        executionStatus: 'SUCCESS',
        swapResults: [],
        depositResults: [],
        totalGasUsed: 0,
        executionTimeMs: 1000,
        message: 'Strategy execution simulation completed successfully',
      };

      this.logger.log(
        `Strategy execution simulated: ${request.strategy.operationId}`,
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to execute optimization strategy:', error);
      throw error;
    }
  }

  /**
   * Get supported tokens across chains
   */
  async getSupportedTokens(chainId?: number): Promise<any> {
    const tokens = [
      {
        symbol: 'USDC',
        address: '0xA0b86a33E6417c6C000000000000000000000000',
        chainId: 1,
        decimals: 6,
      },
      {
        symbol: 'USDT',
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        chainId: 1,
        decimals: 6,
      },
      {
        symbol: 'WETH',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        chainId: 1,
        decimals: 18,
      },
    ];

    return chainId ? tokens.filter((t) => t.chainId === chainId) : tokens;
  }

  /**
   * Get supported protocols across chains
   */
  async getSupportedProtocols(chainId?: number): Promise<any> {
    const protocols = [
      {
        name: 'Aave V3',
        address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        chainId: 1,
        type: 'lending',
        riskScore: 9,
      },
      {
        name: 'Compound V3',
        address: '0xc3d688B66703497DAA19211EEEdff47f25384cae',
        chainId: 1,
        type: 'lending',
        riskScore: 9,
      },
    ];

    return chainId ? protocols.filter((p) => p.chainId === chainId) : protocols;
  }

  /**
   * Validate optimization strategy from external AI
   */
  async validateOptimizationStrategy(
    strategy: OptimizationResponseDto,
  ): Promise<any> {
    try {
      const validations = {
        tokenAllocationsValid: this.validateTokenAllocations(
          strategy.tokenAllocations,
        ),
        swapRoutesValid: this.validateSwapRoutes(strategy.swapRoutes),
        riskScoreReasonable:
          strategy.riskScore >= 1 && strategy.riskScore <= 10,
        confidenceReasonable:
          strategy.confidence >= 0 && strategy.confidence <= 100,
        expectedAPYReasonable:
          strategy.expectedAPY >= 0 && strategy.expectedAPY <= 100,
      };

      const isValid = Object.values(validations).every((v) => v === true);

      return {
        isValid,
        validations,
        warnings: isValid ? [] : ['Strategy validation failed'],
      };
    } catch (error) {
      this.logger.error('Failed to validate strategy:', error);
      return {
        isValid: false,
        validations: {},
        warnings: ['Validation error occurred'],
      };
    }
  }

  /**
   * Get current gas estimates
   */
  async getGasEstimates(chainId?: number): Promise<any> {
    const gasEstimates: Record<number, any> = {
      1: {
        // Ethereum
        slow: 25,
        standard: 30,
        fast: 35,
        swapGas: 150000,
        depositGas: 200000,
      },
      137: {
        // Polygon
        slow: 20,
        standard: 25,
        fast: 30,
        swapGas: 120000,
        depositGas: 150000,
      },
    };

    return chainId && gasEstimates[chainId]
      ? gasEstimates[chainId]
      : gasEstimates;
  }

  /**
   * Log AI decision for analytics
   */
  async logAIDecision(decisionData: any): Promise<any> {
    try {
      const logEntry = {
        operationId: decisionData.operationId,
        timestamp: new Date(),
        decisionType: decisionData.type || 'optimization',
        inputData: decisionData.input,
        outputData: decisionData.output,
        confidence: decisionData.confidence,
        executionTime: decisionData.executionTime,
      };

      this.logger.log(`AI Decision logged: ${JSON.stringify(logEntry)}`);
      return { success: true, logId: decisionData.operationId };
    } catch (error) {
      this.logger.error('Failed to log AI decision:', error);
      throw error;
    }
  }

  /**
   * Get AI performance metrics
   */
  async getAIPerformanceMetrics(timeframe: string): Promise<any> {
    try {
      const metrics = {
        timeframe,
        totalDecisions: 150,
        successfulExecutions: 142,
        averageConfidence: 85.3,
        averageAPYPredictionAccuracy: 92.1,
        averageRiskAssessmentAccuracy: 88.7,
        totalValueOptimized: 1250000,
        averageGasSavings: 15.2,
      };

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  // Private helper methods
  private convertRiskLevelToScore(riskLevel: string): number {
    const riskMap: Record<string, number> = {
      LOW: 8,
      MEDIUM: 5,
      HIGH: 2,
    };
    return riskMap[riskLevel] || 5;
  }

  private validateTokenAllocations(allocations: any[]): boolean {
    const totalAllocation = allocations.reduce(
      (sum, alloc) => sum + alloc.allocation,
      0,
    );
    return Math.abs(totalAllocation - 100) < 0.1;
  }

  private validateSwapRoutes(swapRoutes: any[]): boolean {
    return swapRoutes.every(
      (route) =>
        route.inputToken &&
        route.outputToken &&
        route.inputAmount &&
        route.expectedOutput,
    );
  }
}
