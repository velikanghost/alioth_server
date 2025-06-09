import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MarketDataCache,
  MarketDataCacheDocument,
} from '../../ai-optimization/schemas/market-data-cache.schema';

export interface SwapParams {
  inputToken: string;
  outputToken: string;
  amount: bigint;
  maxSlippage: number;
  userAddress?: string;
  deadline?: number;
  gasPrice?: bigint;
}

export interface SwapRoute {
  aggregator: string;
  route: string;
  expectedOutput: bigint;
  gasEstimate: number;
  priceImpact: number;
  confidence: number;
  path: string[];
  protocols: string[];
  fees: number[];
  executionTime: number;
  slippageTolerance: number;
}

export interface SwapResult {
  txHash: string;
  actualOutput: bigint;
  gasUsed: number;
  executionTime: number;
  priceImpact: number;
  slippage: number;
  fees: number;
  success: boolean;
  errorMessage?: string;
}

export interface DEXQuote {
  dex: string;
  outputAmount: bigint;
  gasEstimate: number;
  priceImpact: number;
  route: string[];
  confidence: number;
  liquidityDepth: number;
}

export interface AggregatorResponse {
  bestRoute: SwapRoute;
  alternativeRoutes: SwapRoute[];
  marketAnalysis: {
    averagePrice: number;
    priceSpread: number;
    liquidityScore: number;
    volatilityWarning: boolean;
  };
  recommendations: string[];
}

@Injectable()
export class DEXAggregatorService {
  private readonly logger = new Logger(DEXAggregatorService.name);

  // DEX configurations
  private readonly DEX_CONFIGS: Record<
    string,
    {
      apiUrl?: string;
      gasMultiplier: number;
      reliability: number;
      supportedChains: number[];
    }
  > = {
    '1inch': {
      apiUrl: 'https://api.1inch.io/v5.0/1',
      gasMultiplier: 1.1,
      reliability: 0.95,
      supportedChains: [1, 137, 56, 43114],
    },
    paraswap: {
      apiUrl: 'https://apiv5.paraswap.io',
      gasMultiplier: 1.05,
      reliability: 0.92,
      supportedChains: [1, 137, 56, 43114],
    },
    'uniswap-v3': {
      gasMultiplier: 1.2,
      reliability: 0.98,
      supportedChains: [1, 137, 42161, 10],
    },
    sushiswap: {
      gasMultiplier: 1.15,
      reliability: 0.88,
      supportedChains: [1, 137, 56, 43114],
    },
    curve: {
      gasMultiplier: 1.3,
      reliability: 0.94,
      supportedChains: [1, 137, 43114],
    },
  };

  // Token configurations for better routing
  private readonly TOKEN_CONFIGS: Record<
    string,
    { symbol: string; decimals: number; isStable: boolean }
  > = {
    // Ethereum Mainnet
    '0xA0b86a33E6441c8C06DD2b7c94b7E6E8E8b8c8D8': {
      symbol: 'WETH',
      decimals: 18,
      isStable: false,
    },
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
      symbol: 'DAI',
      decimals: 18,
      isStable: true,
    },
    '0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b': {
      symbol: 'USDC',
      decimals: 6,
      isStable: true,
    },
    '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9': {
      symbol: 'AAVE',
      decimals: 18,
      isStable: false,
    },
    // Sepolia Testnet
    '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': {
      symbol: 'AAVE',
      decimals: 18,
      isStable: false,
    },
    '0x29f2D40B0605204364af54EC677bD022dA425d03': {
      symbol: 'WBTC',
      decimals: 8,
      isStable: false,
    },
    '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': {
      symbol: 'WETH',
      decimals: 18,
      isStable: false,
    },
  };

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(MarketDataCache.name)
    private marketDataCacheModel: Model<MarketDataCacheDocument>,
  ) {}

  async findOptimalSwapRoute(params: SwapParams): Promise<AggregatorResponse> {
    this.logger.log(
      `Finding optimal swap route: ${params.inputToken} -> ${params.outputToken} (${params.amount.toString()})`,
    );

    try {
      // 1. Get quotes from multiple DEXs
      const quotes = await this.getMultiDEXQuotes(params);

      // 2. Analyze market conditions
      const marketAnalysis = await this.analyzeMarketConditions(
        params.inputToken,
        params.outputToken,
        params.amount,
      );

      // 3. Score and rank routes
      const rankedRoutes = await this.scoreAndRankRoutes(
        quotes,
        params,
        marketAnalysis,
      );

      // 4. Generate recommendations
      const recommendations = this.generateSwapRecommendations(
        rankedRoutes,
        marketAnalysis,
        params,
      );

      // 5. Select best route
      const bestRoute = rankedRoutes[0];
      const alternativeRoutes = rankedRoutes.slice(1, 4); // Top 3 alternatives

      this.logger.log(
        `Best route found: ${bestRoute.aggregator} with ${bestRoute.confidence}% confidence`,
      );

      return {
        bestRoute,
        alternativeRoutes,
        marketAnalysis,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to find optimal swap route: ${error.message}`);
      throw new Error(`Route finding failed: ${error.message}`);
    }
  }

  async executeSwap(route: SwapRoute, params: SwapParams): Promise<SwapResult> {
    this.logger.log(`Executing swap via ${route.aggregator}`);

    const startTime = Date.now();

    try {
      // 1. Validate route is still optimal
      await this.validateRouteBeforeExecution(route, params);

      // 2. Execute the swap based on aggregator
      let result: SwapResult;

      switch (route.aggregator) {
        case '1inch':
          result = await this.execute1inchSwap(route, params);
          break;
        case 'paraswap':
          result = await this.executeParaswapSwap(route, params);
          break;
        case 'uniswap-v3':
          result = await this.executeUniswapV3Swap(route, params);
          break;
        default:
          result = await this.executeMockSwap(route, params);
      }

      // 3. Calculate actual metrics
      result.executionTime = Date.now() - startTime;
      result.slippage = this.calculateActualSlippage(
        route.expectedOutput,
        result.actualOutput,
      );

      // 4. Log execution for analysis
      await this.logSwapExecution(route, params, result);

      this.logger.log(
        `Swap executed successfully: ${result.txHash} (${result.executionTime}ms)`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Swap execution failed: ${error.message}`);

      const failedResult: SwapResult = {
        txHash: '',
        actualOutput: 0n,
        gasUsed: 0,
        executionTime: Date.now() - startTime,
        priceImpact: route.priceImpact,
        slippage: 0,
        fees: 0,
        success: false,
        errorMessage: error.message,
      };

      await this.logSwapExecution(route, params, failedResult);
      throw error;
    }
  }

  async validateSwapFeasibility(params: SwapParams): Promise<{
    isFeasible: boolean;
    reasons: string[];
    recommendations: string[];
  }> {
    this.logger.log(
      `Validating swap feasibility for ${params.inputToken} -> ${params.outputToken}`,
    );

    const reasons: string[] = [];
    const recommendations: string[] = [];

    try {
      // 1. Check token support
      const inputTokenConfig = this.TOKEN_CONFIGS[params.inputToken];
      const outputTokenConfig = this.TOKEN_CONFIGS[params.outputToken];

      if (!inputTokenConfig) {
        reasons.push(`Input token ${params.inputToken} not supported`);
      }

      if (!outputTokenConfig) {
        reasons.push(`Output token ${params.outputToken} not supported`);
      }

      // 2. Check minimum amount
      const minAmount = this.getMinimumSwapAmount(params.inputToken);
      if (params.amount < minAmount) {
        reasons.push(
          `Amount below minimum threshold (${minAmount.toString()})`,
        );
        recommendations.push(
          `Increase amount to at least ${minAmount.toString()}`,
        );
      }

      // 3. Check liquidity
      const liquidityCheck = await this.checkLiquidity(params);
      if (!liquidityCheck.sufficient) {
        reasons.push('Insufficient liquidity for requested amount');
        recommendations.push(
          `Consider reducing amount to ${liquidityCheck.maxAmount.toString()}`,
        );
      }

      // 4. Check slippage tolerance
      if (params.maxSlippage > 0.1) {
        // 10%
        recommendations.push(
          'High slippage tolerance may result in significant losses',
        );
      }

      // 5. Check gas price
      const gasEstimate = await this.estimateGasCost(params);
      if (
        gasEstimate.gasCostUSD >
        parseFloat(params.amount.toString()) * 0.05
      ) {
        recommendations.push('Gas cost is high relative to swap amount');
      }

      const isFeasible = reasons.length === 0;

      return {
        isFeasible,
        reasons,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Feasibility check failed: ${error.message}`);
      return {
        isFeasible: false,
        reasons: [`Feasibility check failed: ${error.message}`],
        recommendations: ['Try again later or contact support'],
      };
    }
  }

  async getSwapHistory(
    userAddress: string,
    limit: number = 50,
  ): Promise<SwapResult[]> {
    this.logger.log(`Getting swap history for ${userAddress}`);

    try {
      // In production, fetch from database
      // For now, return mock data
      return this.generateMockSwapHistory(userAddress, limit);
    } catch (error) {
      this.logger.error(`Failed to get swap history: ${error.message}`);
      return [];
    }
  }

  private async getMultiDEXQuotes(params: SwapParams): Promise<DEXQuote[]> {
    const quotes: DEXQuote[] = [];

    // Get quotes from multiple DEXs in parallel
    const quotePromises = Object.keys(this.DEX_CONFIGS).map(async (dex) => {
      try {
        return await this.getQuoteFromDEX(dex, params);
      } catch (error) {
        this.logger.warn(`Failed to get quote from ${dex}: ${error.message}`);
        return null;
      }
    });

    const results = await Promise.allSettled(quotePromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value);
      }
    });

    return quotes;
  }

  private async getQuoteFromDEX(
    dex: string,
    params: SwapParams,
  ): Promise<DEXQuote> {
    // Mock implementation - in production, integrate with actual DEX APIs
    const config = this.DEX_CONFIGS[dex];
    const baseOutput = (params.amount * 95n) / 100n; // 5% slippage base

    // Add some randomness to simulate different DEX rates
    const variance = (Math.random() - 0.5) * 0.1; // ±5% variance
    const outputAmount = BigInt(
      Math.floor(Number(baseOutput) * (1 + variance)),
    );

    return {
      dex,
      outputAmount,
      gasEstimate: Math.floor(150000 * config.gasMultiplier),
      priceImpact: Math.abs(variance) * 100,
      route: [params.inputToken, params.outputToken],
      confidence: config.reliability * 100,
      liquidityDepth: Math.random() * 1000000, // Mock liquidity
    };
  }

  private async analyzeMarketConditions(
    inputToken: string,
    outputToken: string,
    amount: bigint,
  ) {
    // Mock market analysis - in production, use real market data
    return {
      averagePrice: 1.0,
      priceSpread: 0.02, // 2% spread
      liquidityScore: 0.85, // Good liquidity
      volatilityWarning: false,
    };
  }

  private async scoreAndRankRoutes(
    quotes: DEXQuote[],
    params: SwapParams,
    marketAnalysis: any,
  ): Promise<SwapRoute[]> {
    const routes: SwapRoute[] = quotes.map((quote) => {
      // Calculate composite score based on multiple factors
      const outputScore = Number(quote.outputAmount) / Number(params.amount);
      const gasScore = 1 / (quote.gasEstimate / 150000); // Normalize to base gas
      const reliabilityScore = quote.confidence / 100;
      const liquidityScore = Math.min(quote.liquidityDepth / 100000, 1); // Normalize liquidity

      const compositeScore =
        outputScore * 0.4 +
        gasScore * 0.2 +
        reliabilityScore * 0.2 +
        liquidityScore * 0.2;

      return {
        aggregator: quote.dex,
        route: `${params.inputToken}->${params.outputToken}`,
        expectedOutput: quote.outputAmount,
        gasEstimate: quote.gasEstimate,
        priceImpact: quote.priceImpact,
        confidence: Math.round(compositeScore * 100),
        path: quote.route,
        protocols: [quote.dex],
        fees: [0.003], // 0.3% fee
        executionTime: 0,
        slippageTolerance: params.maxSlippage,
      };
    });

    // Sort by confidence score (descending)
    return routes.sort((a, b) => b.confidence - a.confidence);
  }

  private generateSwapRecommendations(
    routes: SwapRoute[],
    marketAnalysis: any,
    params: SwapParams,
  ): string[] {
    const recommendations: string[] = [];

    if (routes.length === 0) {
      recommendations.push(
        'No viable routes found. Try adjusting slippage tolerance.',
      );
      return recommendations;
    }

    const bestRoute = routes[0];

    if (bestRoute.priceImpact > 5) {
      recommendations.push(
        'High price impact detected. Consider splitting the trade.',
      );
    }

    if (bestRoute.gasEstimate > 300000) {
      recommendations.push(
        'High gas cost. Consider waiting for lower gas prices.',
      );
    }

    if (marketAnalysis.volatilityWarning) {
      recommendations.push(
        'High market volatility. Consider using tighter slippage tolerance.',
      );
    }

    if (
      routes.length > 1 &&
      routes[1].confidence > bestRoute.confidence * 0.95
    ) {
      recommendations.push(
        'Multiple good routes available. Consider the alternative for better gas efficiency.',
      );
    }

    return recommendations;
  }

  private async validateRouteBeforeExecution(
    route: SwapRoute,
    params: SwapParams,
  ): Promise<void> {
    // Re-validate the route is still optimal before execution
    const currentQuote = await this.getQuoteFromDEX(route.aggregator, params);

    const outputDifference = Math.abs(
      Number(currentQuote.outputAmount - route.expectedOutput) /
        Number(route.expectedOutput),
    );

    if (outputDifference > 0.05) {
      // 5% difference
      throw new Error(
        'Route conditions have changed significantly. Please get a new quote.',
      );
    }
  }

  private async execute1inchSwap(
    route: SwapRoute,
    params: SwapParams,
  ): Promise<SwapResult> {
    // Mock 1inch execution
    return this.executeMockSwap(route, params);
  }

  private async executeParaswapSwap(
    route: SwapRoute,
    params: SwapParams,
  ): Promise<SwapResult> {
    // Mock Paraswap execution
    return this.executeMockSwap(route, params);
  }

  private async executeUniswapV3Swap(
    route: SwapRoute,
    params: SwapParams,
  ): Promise<SwapResult> {
    // Mock Uniswap V3 execution
    return this.executeMockSwap(route, params);
  }

  private async executeMockSwap(
    route: SwapRoute,
    params: SwapParams,
  ): Promise<SwapResult> {
    // Simulate swap execution with realistic results
    const actualSlippage = Math.random() * params.maxSlippage * 0.8; // Usually less than max
    const actualOutput =
      (route.expectedOutput * BigInt(Math.floor((1 - actualSlippage) * 100))) /
      100n;

    return {
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      actualOutput,
      gasUsed: Math.floor(route.gasEstimate * (0.9 + Math.random() * 0.2)), // ±10% variance
      executionTime: 0, // Will be set by caller
      priceImpact: route.priceImpact,
      slippage: actualSlippage,
      fees: (route.fees[0] * Number(params.amount)) / 1e18,
      success: true,
    };
  }

  private calculateActualSlippage(expected: bigint, actual: bigint): number {
    if (expected === 0n) return 0;
    return Number(expected - actual) / Number(expected);
  }

  private async logSwapExecution(
    route: SwapRoute,
    params: SwapParams,
    result: SwapResult,
  ): Promise<void> {
    // Log swap execution for analytics and improvement
    this.logger.debug(
      `Swap logged: ${route.aggregator} | Success: ${result.success} | Slippage: ${result.slippage.toFixed(4)}`,
    );

    // In production, store in database for analysis
  }

  private async checkLiquidity(params: SwapParams): Promise<{
    sufficient: boolean;
    maxAmount: bigint;
  }> {
    // Mock liquidity check
    const maxAmount = params.amount * 10n; // Assume 10x liquidity available
    return {
      sufficient: true,
      maxAmount,
    };
  }

  private getMinimumSwapAmount(token: string): bigint {
    // Return minimum swap amount based on token
    const config = this.TOKEN_CONFIGS[token];
    if (!config) return 1000000n; // Default 1M wei

    // Minimum $10 equivalent
    return BigInt(10 * Math.pow(10, config.decimals));
  }

  private async estimateGasCost(params: SwapParams): Promise<{
    gasEstimate: number;
    gasCostUSD: number;
  }> {
    const gasEstimate = 200000; // Base estimate
    const gasPrice = 20; // 20 gwei
    const ethPrice = 2000; // $2000 ETH

    const gasCostUSD = (gasEstimate * gasPrice * ethPrice) / 1e9;

    return {
      gasEstimate,
      gasCostUSD,
    };
  }

  private generateMockSwapHistory(
    userAddress: string,
    limit: number,
  ): SwapResult[] {
    const history: SwapResult[] = [];

    for (let i = 0; i < Math.min(limit, 10); i++) {
      history.push({
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        actualOutput: BigInt(Math.floor(Math.random() * 1e18)),
        gasUsed: Math.floor(150000 + Math.random() * 100000),
        executionTime: Math.floor(1000 + Math.random() * 5000),
        priceImpact: Math.random() * 2,
        slippage: Math.random() * 0.05,
        fees: Math.random() * 50,
        success: Math.random() > 0.1, // 90% success rate
      });
    }

    return history;
  }
}
