import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  UserPortfolio,
  UserPortfolioDocument,
} from '../schemas/user-portfolio.schema';
import {
  AIDecisionLog,
  AIDecisionLogDocument,
} from '../schemas/ai-decision-log.schema';
import {
  MarketDataCache,
  MarketDataCacheDocument,
} from '../schemas/market-data-cache.schema';
import { ChainlinkDataService } from '../../market-analysis/services/chainlink-data.service';

import { DEXAggregatorService } from '../../swap-execution/services/dex-aggregator.service';

import {
  OptimizeDepositDto,
  OptimizationStrategyDto,
  TokenAllocationDto,
  SwapRouteDto,
} from '../dto/optimize-deposit.dto';
import { v4 as uuidv4 } from 'uuid';
import { AIAuthorizationService } from './ai-authorization.service';
import { CrossTokenAllocationEngine } from './cross-token-allocation-engine.service';
import { Web3ContractService } from './web3-contract.service';

export interface MarketAnalysis {
  tokens: string[];
  prices: string[];
  yields: string[];
  volatilities: string[];
  risks: string[];
  correlations: number[][];
  timestamp: Date;
}

export interface OptimizationStrategy {
  operationId: string;
  userAddress: string;
  inputDetails: OptimizeDepositDto;
  tokenAllocations: TokenAllocationDto[];
  swapRoutes: SwapRouteDto[];
  expectedAPY: number;
  riskScore: number;
  diversificationScore: number;
  estimatedGasCostUSD: number;
  confidence: number;
  reasoning: string;
  expiresAt?: number;
}

export interface ExecutionResult {
  operationId: string;
  executionStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  transactionHashes: string[];
  actualAllocation: Record<string, number>;
  totalGasUsed: string;
  totalGasCostUSD: number;
  swapResults: any[];
  protocolDepositResults: any[];
  slippageExperienced: Record<string, number>;
  executionTimeMs: number;
  errorMessage?: string;
}

export interface RebalanceOpportunity {
  userId: string;
  currentAllocation: Record<string, number>;
  recommendedAllocation: Record<string, number>;
  expectedYieldImprovement: number;
  riskImpact: number;
  estimatedGasCost: number;
  confidence: number;
  reasoning: string;
}

@Injectable()
export class AIYieldOptimizationService {
  private readonly logger = new Logger(AIYieldOptimizationService.name);

  constructor(
    @InjectModel(UserPortfolio.name)
    private userPortfolioModel: Model<UserPortfolioDocument>,
    @InjectModel(AIDecisionLog.name)
    private aiDecisionLogModel: Model<AIDecisionLogDocument>,
    @InjectModel(MarketDataCache.name)
    private marketDataCacheModel: Model<MarketDataCacheDocument>,
    private readonly chainlinkService: ChainlinkDataService,
    private readonly allocationEngine: CrossTokenAllocationEngine,
    private readonly dexService: DEXAggregatorService,
    private readonly contractService: Web3ContractService,
    private readonly authService: AIAuthorizationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Main entry point for AI-driven deposit optimization
   */
  async optimizeDeposit(
    request: OptimizeDepositDto,
  ): Promise<OptimizationStrategy> {
    const startTime = Date.now();
    const operationId = `opt_${uuidv4()}`;

    try {
      this.logger.log(
        `Starting deposit optimization for ${request.userAddress} with ${request.inputAmount} ${request.inputToken}`,
      );

      // Step 1: Validate input and get supported tokens
      await this.validateOptimizationRequest(request);
      const supportedTokens = await this.getSupportedTokens();

      // Step 2: Get comprehensive market analysis
      const marketData = await this.getMarketAnalysis(supportedTokens);

      // Step 3: Calculate optimal cross-token allocation
      const allocation = await this.calculateOptimalAllocation(
        request,
        marketData,
        supportedTokens,
      );

      // Step 4: Find optimal swap routes for required swaps
      const swapRoutes = await this.findOptimalSwapRoutes(request, allocation);

      // Step 5: Validate strategy profitability and risk
      const validation = await this.validateStrategy(allocation, request);

      // Step 6: Build final optimization strategy
      const strategy = await this.buildOptimizationStrategy(
        operationId,
        request,
        allocation,
        swapRoutes,
        validation,
        marketData,
      );

      // Step 7: Log AI decision for learning
      await this.logAIDecision(operationId, request, strategy, startTime);

      this.logger.log(
        `Optimization strategy created for ${request.userAddress}: ${strategy.expectedAPY}% APY, ${strategy.confidence}% confidence`,
      );

      return strategy;
    } catch (error) {
      this.logger.error(
        `Optimization failed for ${request.userAddress}: ${error.message}`,
        error.stack,
      );

      // Log failed decision for analysis
      await this.logFailedDecision(operationId, request, error, startTime);

      throw new InternalServerErrorException(
        `Optimization failed: ${error.message}`,
      );
    }
  }

  /**
   * Execute an AI-optimized deposit strategy
   */
  async executeOptimizedDeposit(
    strategy: OptimizationStrategy,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Executing optimization strategy ${strategy.operationId} for ${strategy.userAddress}`,
      );

      // Step 1: Validate strategy hasn't expired
      if (strategy.expiresAt && Date.now() > strategy.expiresAt) {
        throw new BadRequestException(
          'Strategy has expired, please generate a new one',
        );
      }

      // Step 2: Re-validate current market conditions
      await this.revalidateStrategy(strategy);

      // Step 3: Authorize AI operation with smart contract
      const authResult = await this.authService.authorizeOperation({
        userId: strategy.userAddress,
        operation: 'optimized_deposit',
        parameters: {
          operationId: strategy.operationId,
          tokenAllocations: strategy.tokenAllocations,
        },
        timestamp: Date.now(),
      });

      // Step 4: Execute swaps using optimal DEX routes
      const swapResults = await this.executeSwaps(strategy.swapRoutes);

      if (!authResult.authorized) {
        throw new UnauthorizedException(
          `Authorization failed: ${authResult.reason}`,
        );
      }

      // Step 5: Execute protocol deposits via smart contract
      const depositResults = await this.executeProtocolDeposits(
        strategy,
        swapResults,
        authResult.userId,
      );

      // Step 6: Update user portfolio
      await this.updateUserPortfolio(strategy.userAddress, depositResults);

      // Step 7: Build execution result
      const executionResult = await this.buildExecutionResult(
        strategy.operationId,
        swapResults,
        depositResults,
        startTime,
      );

      // Step 8: Update AI decision log with execution results
      await this.updateAIDecisionLog(strategy.operationId, executionResult);

      this.logger.log(
        `Successfully executed optimization ${strategy.operationId} for ${strategy.userAddress}`,
      );

      return executionResult;
    } catch (error) {
      this.logger.error(
        `Execution failed for ${strategy.operationId}: ${error.message}`,
        error.stack,
      );

      // Log execution failure
      await this.logExecutionFailure(strategy.operationId, error, startTime);

      throw new InternalServerErrorException(
        `Execution failed: ${error.message}`,
      );
    }
  }

  /**
   * Analyze rebalance opportunities for user portfolios
   */
  async analyzeRebalanceOpportunities(
    portfolios: UserPortfolio[],
  ): Promise<RebalanceOpportunity[]> {
    const opportunities: RebalanceOpportunity[] = [];

    try {
      this.logger.log(
        `Analyzing rebalance opportunities for ${portfolios.length} portfolios`,
      );

      for (const portfolio of portfolios) {
        if (!portfolio.autoRebalanceEnabled) {
          continue;
        }

        // Skip if recently rebalanced (within 24 hours)
        const hoursSinceRebalance =
          (Date.now() - portfolio.lastRebalanceTime.getTime()) /
          (1000 * 60 * 60);
        if (hoursSinceRebalance < 24) {
          continue;
        }

        try {
          const opportunity = await this.analyzePortfolioRebalance(portfolio);
          if (opportunity && opportunity.expectedYieldImprovement > 0.5) {
            // 0.5% minimum improvement
            opportunities.push(opportunity);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to analyze rebalance for ${portfolio.userAddress}: ${error.message}`,
          );
        }
      }

      this.logger.log(`Found ${opportunities.length} rebalance opportunities`);
      return opportunities;
    } catch (error) {
      this.logger.error(
        `Failed to analyze rebalance opportunities: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get comprehensive market analysis for supported tokens
   */
  private async getMarketAnalysis(tokens: string[]): Promise<MarketAnalysis> {
    try {
      // Check cache first
      const cachedData = await this.marketDataCacheModel.find({
        token: { $in: tokens },
        isSupported: true,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      const cachedTokens = cachedData.map((data) => data.token);
      const missingTokens = tokens.filter(
        (token) => !cachedTokens.includes(token),
      );

      // Fetch missing data from Chainlink
      let freshData: any = {};
      if (missingTokens.length > 0) {
        freshData =
          await this.chainlinkService.getMarketAnalysis(missingTokens);

        // Update cache
        await this.updateMarketDataCache(missingTokens, freshData);
      }

      // Combine cached and fresh data
      return this.combineMarketData(cachedData, freshData, tokens);
    } catch (error) {
      this.logger.error(
        `Failed to get market analysis: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calculate optimal allocation using AI algorithms
   */
  private async calculateOptimalAllocation(
    request: OptimizeDepositDto,
    marketData: MarketAnalysis,
    availableTokens: string[],
  ): Promise<TokenAllocationDto[]> {
    try {
      // Filter tokens based on user preferences
      const eligibleTokens = this.filterEligibleTokens(
        availableTokens,
        request,
      );

      // Use allocation engine to calculate optimal distribution
      const allocationStrategy =
        await this.allocationEngine.calculateOptimalAllocation({
          depositToken: request.inputToken,
          depositAmount: BigInt(request.inputAmount),
          availableTokens: eligibleTokens,
          userRiskTolerance: request.riskTolerance || 5,
          maxSlippage: request.maxSlippage || 300,
          maxGasCost: 0.05, // $50 max gas cost
          timeHorizon: 'MEDIUM',
          minimumYield: request.minYieldImprovement || 50,
        });

      return this.convertToTokenAllocations(
        allocationStrategy,
        request.inputAmount,
      );
    } catch (error) {
      this.logger.error(
        `Failed to calculate optimal allocation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find optimal swap routes for token conversions
   */
  private async findOptimalSwapRoutes(
    request: OptimizeDepositDto,
    allocations: TokenAllocationDto[],
  ): Promise<SwapRouteDto[]> {
    const routes: SwapRouteDto[] = [];

    try {
      for (const allocation of allocations) {
        if (allocation.token !== request.inputToken) {
          const routeResponse = await this.dexService.findOptimalSwapRoute({
            inputToken: request.inputToken,
            outputToken: allocation.token,
            amount: BigInt(allocation.amount),
            maxSlippage: request.maxSlippage || 300,
          });

          const bestRoute = routeResponse.bestRoute;

          routes.push({
            inputToken: request.inputToken,
            outputToken: allocation.token,
            inputAmount: allocation.amount,
            expectedOutput: bestRoute.expectedOutput.toString(),
            aggregator: bestRoute.aggregator,
            routeData: bestRoute.route,
            gasEstimate: bestRoute.gasEstimate,
            priceImpact: bestRoute.priceImpact,
          });
        }
      }

      return routes;
    } catch (error) {
      this.logger.error(
        `Failed to find swap routes: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate strategy meets profitability and risk requirements
   */
  private async validateStrategy(
    allocation: TokenAllocationDto[],
    request: OptimizeDepositDto,
  ): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // Check minimum yield improvement
      const weightedAPY = this.calculateWeightedAPY(allocation);

      // Get current yield of input token for comparison
      const inputTokenData = await this.marketDataCacheModel.findOne({
        token: request.inputToken,
      });
      const inputTokenAPY = inputTokenData?.currentAPY || 0;

      const yieldImprovement = weightedAPY - inputTokenAPY;
      const minImprovement = (request.minYieldImprovement || 50) / 10000; // Convert basis points to percentage

      if (yieldImprovement < minImprovement) {
        return {
          isValid: false,
          reason: `Yield improvement ${yieldImprovement.toFixed(2)}% is below minimum required ${minImprovement.toFixed(2)}%`,
        };
      }

      // Check portfolio risk vs user tolerance
      const portfolioRisk = this.calculatePortfolioRisk(allocation);
      const maxRisk = request.riskTolerance ? request.riskTolerance * 10 : 50; // Convert 1-10 scale to 1-100

      if (portfolioRisk > maxRisk) {
        return {
          isValid: false,
          reason: `Portfolio risk ${portfolioRisk} exceeds user tolerance ${maxRisk}`,
        };
      }

      return { isValid: true };
    } catch (error) {
      this.logger.error(
        `Strategy validation failed: ${error.message}`,
        error.stack,
      );
      return { isValid: false, reason: `Validation error: ${error.message}` };
    }
  }

  /**
   * Build complete optimization strategy response
   */
  private async buildOptimizationStrategy(
    operationId: string,
    request: OptimizeDepositDto,
    allocations: TokenAllocationDto[],
    swapRoutes: SwapRouteDto[],
    validation: any,
    marketData: MarketAnalysis,
  ): Promise<OptimizationStrategy> {
    const expectedAPY = this.calculateWeightedAPY(allocations);
    const riskScore = this.calculatePortfolioRisk(allocations);
    const diversificationScore =
      this.calculateDiversificationScore(allocations);
    const estimatedGasCost = this.calculateEstimatedGasCost(swapRoutes);
    const confidence = this.calculateAIConfidence(allocations, marketData);

    const reasoning = this.generateAIReasoning(
      allocations,
      expectedAPY,
      riskScore,
      diversificationScore,
    );

    return {
      operationId,
      userAddress: request.userAddress,
      inputDetails: request,
      tokenAllocations: allocations,
      swapRoutes,
      expectedAPY,
      riskScore,
      diversificationScore,
      estimatedGasCostUSD: estimatedGasCost,
      confidence,
      reasoning,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes expiry
    };
  }

  /**
   * Helper methods
   */
  private async validateOptimizationRequest(
    request: OptimizeDepositDto,
  ): Promise<void> {
    // Validate token is supported
    const tokenData = await this.marketDataCacheModel.findOne({
      token: request.inputToken,
      isSupported: true,
      isActive: true,
    });

    if (!tokenData) {
      throw new BadRequestException(
        `Token ${request.inputToken} is not supported`,
      );
    }

    // Validate minimum amount
    const amount = BigInt(request.inputAmount);
    if (amount <= 0) {
      throw new BadRequestException('Invalid deposit amount');
    }
  }

  private async getSupportedTokens(): Promise<string[]> {
    const tokens = await this.marketDataCacheModel
      .find({
        isSupported: true,
        isActive: true,
      })
      .select('token');

    return tokens.map((t) => t.token);
  }

  private filterEligibleTokens(
    availableTokens: string[],
    request: OptimizeDepositDto,
  ): string[] {
    let eligible = [...availableTokens];

    // Apply user preferences
    if (request.preferredTokens && request.preferredTokens.length > 0) {
      eligible = eligible.filter((token) =>
        request.preferredTokens!.includes(token),
      );
    }

    if (request.excludedTokens && request.excludedTokens.length > 0) {
      eligible = eligible.filter(
        (token) => !request.excludedTokens!.includes(token),
      );
    }

    return eligible;
  }

  private calculateWeightedAPY(allocations: TokenAllocationDto[]): number {
    const totalWeight = allocations.reduce(
      (sum, alloc) => sum + alloc.percentage,
      0,
    );
    const weightedSum = allocations.reduce(
      (sum, alloc) => sum + alloc.expectedAPY * alloc.percentage,
      0,
    );

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculatePortfolioRisk(allocations: TokenAllocationDto[]): number {
    const totalWeight = allocations.reduce(
      (sum, alloc) => sum + alloc.percentage,
      0,
    );
    const weightedRisk = allocations.reduce(
      (sum, alloc) => sum + alloc.riskScore * alloc.percentage,
      0,
    );

    return totalWeight > 0 ? weightedRisk / totalWeight : 0;
  }

  private calculateDiversificationScore(
    allocations: TokenAllocationDto[],
  ): number {
    const numTokens = allocations.length;
    const maxConcentration = Math.max(...allocations.map((a) => a.percentage));

    // Higher score for more tokens and lower concentration
    const tokenScore = Math.min(numTokens * 20, 60); // Max 60 points for 3+ tokens
    const concentrationScore = Math.max(40 - maxConcentration, 0); // Max 40 points, penalize concentration

    return Math.min(tokenScore + concentrationScore, 100);
  }

  private calculateEstimatedGasCost(swapRoutes: SwapRouteDto[]): number {
    const totalGas = swapRoutes.reduce(
      (sum, route) => sum + route.gasEstimate,
      0,
    );
    const gasPrice = 20; // 20 gwei assumption
    const ethPrice = 2000; // $2000 ETH assumption - should be fetched from actual price

    return (totalGas * gasPrice * ethPrice) / 1e9; // Convert to USD
  }

  private calculateAIConfidence(
    allocations: TokenAllocationDto[],
    marketData: MarketAnalysis,
  ): number {
    // Base confidence on market data freshness, diversification, and expected returns
    const dataFreshness = this.calculateDataFreshness(marketData);
    const diversification = this.calculateDiversificationScore(allocations);
    const expectedReturn = this.calculateWeightedAPY(allocations);

    // Weighted confidence score
    const confidence =
      dataFreshness * 0.3 +
      diversification * 0.4 +
      Math.min(expectedReturn * 5, 30) * 0.3;

    return Math.min(Math.max(confidence, 20), 95); // Clamp between 20-95%
  }

  private calculateDataFreshness(marketData: MarketAnalysis): number {
    const now = Date.now();
    const dataAge = (now - marketData.timestamp.getTime()) / (1000 * 60); // Age in minutes

    // Full confidence for data less than 5 minutes old, declining to 50% at 30 minutes
    return Math.max(100 - dataAge * 2, 50);
  }

  private generateAIReasoning(
    allocations: TokenAllocationDto[],
    expectedAPY: number,
    riskScore: number,
    diversificationScore: number,
  ): string {
    let reasoning = `Optimal allocation strategy with ${expectedAPY.toFixed(2)}% expected APY. `;

    if (allocations.length > 1) {
      reasoning += `Diversified across ${allocations.length} tokens to reduce risk (diversification score: ${diversificationScore}). `;
    }

    if (riskScore < 40) {
      reasoning += `Conservative allocation with low risk profile. `;
    } else if (riskScore > 70) {
      reasoning += `Aggressive allocation targeting maximum yield. `;
    } else {
      reasoning += `Balanced risk-return profile. `;
    }

    const topAllocation = allocations.reduce((max, alloc) =>
      alloc.percentage > max.percentage ? alloc : max,
    );
    reasoning += `Primary allocation to ${topAllocation.symbol} (${topAllocation.percentage.toFixed(1)}%) offers best risk-adjusted returns.`;

    return reasoning;
  }

  // Additional helper methods would be implemented here for:
  // - logAIDecision()
  // - executeSwaps()
  // - executeProtocolDeposits()
  // - updateUserPortfolio()
  // - analyzePortfolioRebalance()
  // etc.

  private async logAIDecision(
    operationId: string,
    request: OptimizeDepositDto,
    strategy: OptimizationStrategy,
    startTime: number,
  ): Promise<void> {
    // Implementation would create AIDecisionLog entry
    this.logger.debug(`Logging AI decision for operation ${operationId}`);
  }

  private async logFailedDecision(
    operationId: string,
    request: OptimizeDepositDto,
    error: any,
    startTime: number,
  ): Promise<void> {
    // Implementation would log failed decision for analysis
    this.logger.error(
      `Logging failed decision for operation ${operationId}: ${error.message}`,
    );
  }

  private async combineMarketData(
    cachedData: any[],
    freshData: any,
    tokens: string[],
  ): Promise<MarketAnalysis> {
    // Implementation would combine cached and fresh market data
    return {
      tokens,
      prices: [],
      yields: [],
      volatilities: [],
      risks: [],
      correlations: [],
      timestamp: new Date(),
    };
  }

  private async updateMarketDataCache(
    tokens: string[],
    marketData: any,
  ): Promise<void> {
    // Implementation would update market data cache
    this.logger.debug(`Updating market data cache for ${tokens.length} tokens`);
  }

  private convertToTokenAllocations(
    allocationStrategy: any,
    inputAmount: string,
  ): TokenAllocationDto[] {
    // Implementation would convert allocation engine output to DTOs
    return [];
  }

  private async revalidateStrategy(
    strategy: OptimizationStrategy,
  ): Promise<void> {
    // Implementation would re-validate strategy before execution
    this.logger.debug(`Re-validating strategy ${strategy.operationId}`);
  }

  private async executeSwaps(swapRoutes: SwapRouteDto[]): Promise<any[]> {
    // Implementation would execute DEX swaps
    return [];
  }

  private async executeProtocolDeposits(
    strategy: OptimizationStrategy,
    swapResults: any[],
    authSignature: string,
  ): Promise<any[]> {
    // Implementation would execute protocol deposits via smart contracts
    return [];
  }

  private async updateUserPortfolio(
    userAddress: string,
    depositResults: any[],
  ): Promise<void> {
    // Implementation would update user portfolio in database
    this.logger.debug(`Updating portfolio for user ${userAddress}`);
  }

  private async buildExecutionResult(
    operationId: string,
    swapResults: any[],
    depositResults: any[],
    startTime: number,
  ): Promise<ExecutionResult> {
    // Implementation would build execution result
    return {
      operationId,
      executionStatus: 'SUCCESS',
      transactionHashes: [],
      actualAllocation: {},
      totalGasUsed: '0',
      totalGasCostUSD: 0,
      swapResults,
      protocolDepositResults: depositResults,
      slippageExperienced: {},
      executionTimeMs: Date.now() - startTime,
    };
  }

  private async updateAIDecisionLog(
    operationId: string,
    executionResult: ExecutionResult,
  ): Promise<void> {
    // Implementation would update AI decision log with execution results
    this.logger.debug(`Updating AI decision log for operation ${operationId}`);
  }

  private async logExecutionFailure(
    operationId: string,
    error: any,
    startTime: number,
  ): Promise<void> {
    // Implementation would log execution failure
    this.logger.error(
      `Logging execution failure for operation ${operationId}: ${error.message}`,
    );
  }

  private async analyzePortfolioRebalance(
    portfolio: UserPortfolio,
  ): Promise<RebalanceOpportunity | null> {
    // Implementation would analyze individual portfolio for rebalancing opportunities
    return null;
  }
}
