import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  ChainlinkPriceFeedService,
  PriceData,
} from './chainlink-price-feed.service';
import {
  MarketDataCache,
  MarketDataCacheDocument,
} from '../../../modules/ai-optimization/schemas/market-data-cache.schema';

export interface MarketAnalysis {
  timestamp: Date;
  tokens: TokenAnalysis[];
  marketConditions: MarketConditions;
  correlations: TokenCorrelation[];
  volatilityIndex: number;
  liquidityMetrics: LiquidityMetrics;
}

export interface TokenAnalysis {
  token: string;
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volatility: number;
  liquidityUSD: number;
  yields: YieldData[];
  riskScore: number;
  marketCap?: number;
  volume24h?: number;
}

export interface YieldData {
  protocol: string;
  apy: number;
  tvl: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  lastUpdated: Date;
}

export interface MarketConditions {
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  volatilityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  liquidityCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  fearGreedIndex: number;
  defiTvl: number;
}

export interface TokenCorrelation {
  tokenA: string;
  tokenB: string;
  correlation: number;
  timeframe: '1h' | '24h' | '7d' | '30d';
}

export interface LiquidityMetrics {
  totalLiquidity: number;
  averageSlippage: number;
  liquidityDistribution: Record<string, number>;
}

export interface SwapValidation {
  isValid: boolean;
  priceImpact: number;
  slippage: number;
  gasCost: number;
  warnings: string[];
  recommendedRoute?: string;
}

export interface YieldComparison {
  timestamp: Date;
  comparisons: YieldComparisonData[];
  bestOpportunity: YieldComparisonData;
  riskAdjustedBest: YieldComparisonData;
}

export interface YieldComparisonData {
  token: string;
  protocol: string;
  apy: number;
  tvl: number;
  riskScore: number;
  liquidity: number;
  riskAdjustedReturn: number;
}

@Injectable()
export class ChainlinkDataService {
  private readonly logger = new Logger(ChainlinkDataService.name);

  // Chainlink price feed addresses for Sepolia testnet
  private readonly PRICE_FEEDS = {
    AAVE: '0x4b531A318B0e44B549F3b2f824721b3D0d51930A',
    WETH: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    WBTC: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
    LINK: '0xc59E3633BAAC79493d908e63626716e204A45EdF',
  };

  // DeFi protocol yield sources
  private readonly YIELD_SOURCES = {
    AAVE: 'https://api.aave.com/data/markets-data',
    COMPOUND: 'https://api.compound.finance/api/v2/ctoken',
    YEARN: 'https://api.yearn.finance/v1/chains/1/vaults/all',
  };

  constructor(
    @InjectModel(MarketDataCache.name)
    private marketDataCacheModel: Model<MarketDataCacheDocument>,
    private configService: ConfigService,
    private chainlinkPriceFeedService: ChainlinkPriceFeedService,
  ) {}

  async getMarketAnalysis(tokens: string[]): Promise<MarketAnalysis> {
    this.logger.log(
      `Fetching market analysis for tokens: ${tokens.join(', ')}`,
    );

    try {
      // Check cache first
      const cacheKey = `market_analysis_${tokens.sort().join('_')}`;
      const cached = await this.getCachedData(cacheKey);

      if (cached && this.isCacheValid(cached, 60)) {
        // 1 minute cache
        this.logger.log('Returning cached market analysis');
        return cached.data as MarketAnalysis;
      }

      // Fetch fresh data
      const [tokenAnalyses, marketConditions, correlations] = await Promise.all(
        [
          this.getTokenAnalyses(tokens),
          this.getMarketConditions(),
          this.getTokenCorrelations(tokens),
        ],
      );

      const liquidityMetrics = await this.getLiquidityMetrics(tokens);
      const volatilityIndex = this.calculateVolatilityIndex(tokenAnalyses);

      const analysis: MarketAnalysis = {
        timestamp: new Date(),
        tokens: tokenAnalyses,
        marketConditions,
        correlations,
        volatilityIndex,
        liquidityMetrics,
      };

      // Cache the result
      await this.cacheData(cacheKey, analysis, 60);

      return analysis;
    } catch (error) {
      this.logger.error(`Error fetching market analysis: ${error.message}`);
      throw new Error(`Failed to fetch market analysis: ${error.message}`);
    }
  }

  async validateSwapRates(
    inputToken: string,
    outputToken: string,
    amounts: bigint[],
  ): Promise<SwapValidation> {
    this.logger.log(`Validating swap rates: ${inputToken} -> ${outputToken}`);

    try {
      // Get current prices from Chainlink
      const [inputPrice, outputPrice] = await Promise.all([
        this.getTokenPrice(inputToken),
        this.getTokenPrice(outputToken),
      ]);

      // Calculate expected output
      const expectedRate = inputPrice / outputPrice;

      // Get actual DEX rates for comparison
      const dexRates = await this.getDEXRates(inputToken, outputToken, amounts);

      // Calculate price impact and slippage
      const priceImpact = this.calculatePriceImpact(
        expectedRate,
        dexRates.bestRate,
      );
      const slippage = Math.abs(priceImpact);

      // Estimate gas costs
      const gasCost = await this.estimateSwapGasCost(inputToken, outputToken);

      const warnings: string[] = [];
      if (slippage > 0.03) warnings.push('High slippage detected (>3%)');
      if (priceImpact > 0.05) warnings.push('Significant price impact (>5%)');
      if (gasCost > 0.01)
        warnings.push('High gas cost relative to swap amount');

      return {
        isValid: slippage <= 0.05 && warnings.length === 0,
        priceImpact,
        slippage,
        gasCost,
        warnings,
        recommendedRoute: dexRates.recommendedRoute,
      };
    } catch (error) {
      this.logger.error(`Error validating swap rates: ${error.message}`);
      return {
        isValid: false,
        priceImpact: 0,
        slippage: 0,
        gasCost: 0,
        warnings: [`Validation failed: ${error.message}`],
      };
    }
  }

  async getYieldComparison(
    tokens: string[],
    amounts: bigint[],
  ): Promise<YieldComparison> {
    this.logger.log(
      `Fetching yield comparison for tokens: ${tokens.join(', ')}`,
    );

    try {
      const comparisons: YieldComparisonData[] = [];

      for (const token of tokens) {
        const yields = await this.getTokenYields(token);

        for (const yieldData of yields) {
          const riskAdjustedReturn = this.calculateRiskAdjustedReturn(
            yieldData.apy,
            yieldData.riskLevel,
          );

          comparisons.push({
            token,
            protocol: yieldData.protocol,
            apy: yieldData.apy,
            tvl: yieldData.tvl,
            riskScore: this.convertRiskLevelToScore(yieldData.riskLevel),
            liquidity: yieldData.tvl, // Simplified
            riskAdjustedReturn,
          });
        }
      }

      // Sort by risk-adjusted return
      const sortedComparisons = comparisons.sort(
        (a, b) => b.riskAdjustedReturn - a.riskAdjustedReturn,
      );

      return {
        timestamp: new Date(),
        comparisons: sortedComparisons,
        bestOpportunity: sortedComparisons[0],
        riskAdjustedBest:
          sortedComparisons.find((c) => c.riskScore <= 3) ||
          sortedComparisons[0],
      };
    } catch (error) {
      this.logger.error(`Error fetching yield comparison: ${error.message}`);
      throw new Error(`Failed to fetch yield comparison: ${error.message}`);
    }
  }

  private async getTokenAnalyses(tokens: string[]): Promise<TokenAnalysis[]> {
    const analyses: TokenAnalysis[] = [];

    for (const token of tokens) {
      try {
        const [price, priceChange, volatility, yields] = await Promise.all([
          this.getTokenPrice(token),
          this.getPriceChange24h(token),
          this.getTokenVolatility(token),
          this.getTokenYields(token),
        ]);

        const liquidityUSD = await this.getTokenLiquidity(token);
        const riskScore = this.calculateTokenRiskScore(
          volatility,
          liquidityUSD,
        );

        analyses.push({
          token,
          symbol: this.getTokenSymbol(token),
          currentPrice: price,
          priceChange24h: priceChange,
          volatility,
          liquidityUSD,
          yields,
          riskScore,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to get analysis for token ${token}: ${error.message}`,
        );
      }
    }

    return analyses;
  }

  private async getMarketConditions(): Promise<MarketConditions> {
    // Simplified market conditions - in production, integrate with multiple data sources
    return {
      trend: 'SIDEWAYS',
      volatilityLevel: 'MEDIUM',
      liquidityCondition: 'GOOD',
      fearGreedIndex: 50,
      defiTvl: 50000000000, // $50B
    };
  }

  private async getTokenCorrelations(
    tokens: string[],
  ): Promise<TokenCorrelation[]> {
    const correlations: TokenCorrelation[] = [];

    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const correlation = await this.calculateTokenCorrelation(
          tokens[i],
          tokens[j],
        );
        correlations.push({
          tokenA: tokens[i],
          tokenB: tokens[j],
          correlation,
          timeframe: '24h',
        });
      }
    }

    return correlations;
  }

  private async getLiquidityMetrics(
    tokens: string[],
  ): Promise<LiquidityMetrics> {
    const liquidityData = await Promise.all(
      tokens.map((token) => this.getTokenLiquidity(token)),
    );

    const totalLiquidity = liquidityData.reduce(
      (sum, liquidity) => sum + liquidity,
      0,
    );
    const averageSlippage = 0.005; // 0.5% average

    const liquidityDistribution: Record<string, number> = {};
    tokens.forEach((token, index) => {
      liquidityDistribution[token] = liquidityData[index] / totalLiquidity;
    });

    return {
      totalLiquidity,
      averageSlippage,
      liquidityDistribution,
    };
  }

  private async getTokenPrice(token: string): Promise<number> {
    try {
      // Get chain ID from configuration (default to Sepolia testnet)
      const chainId =
        this.configService.get<number>('config.blockchain.chainId') || 11155111;

      // Convert token address to symbol if needed
      const symbol = this.getTokenSymbol(token);

      // Check if price feed is available for this symbol and chain
      if (
        !this.chainlinkPriceFeedService.isPriceFeedAvailable(symbol, chainId)
      ) {
        this.logger.warn(
          `❌ No Chainlink price feed available for ${symbol} on chain ${chainId}. Using fallback mock price.`,
        );
        return this.getMockPrice(symbol);
      }

      // Get price from Chainlink
      const priceData: PriceData =
        await this.chainlinkPriceFeedService.getTokenPriceUSD(symbol, chainId);

      // Check if price data is stale and log warning
      if (priceData.isStale) {
        this.logger.warn(
          `⚠️ Using stale Chainlink price for ${symbol}: $${priceData.price.toFixed(2)} (${priceData.staleness}s old)`,
        );
      } else {
        this.logger.log(
          `✅ Fresh Chainlink price for ${symbol}: $${priceData.price.toFixed(2)} (${priceData.staleness}s old)`,
        );
      }

      return priceData.price;
    } catch (error) {
      this.logger.error(
        `❌ Failed to get Chainlink price for ${token}: ${error.message}. Using fallback mock price.`,
      );
      // Fallback to mock prices if Chainlink fails
      const symbol = this.getTokenSymbol(token);
      return this.getMockPrice(symbol);
    }
  }

  /**
   * Fallback mock prices for when Chainlink data is unavailable
   */
  private getMockPrice(symbol: string): number {
    // Mock prices for Sepolia testnet - use as fallback only
    const mockPrices: Record<string, number> = {
      AAVE: 85.5,
      WETH: 2300.0,
      ETH: 2300.0,
      WBTC: 42000.0,
      BTC: 42000.0,
      LINK: 12.5,
      USDC: 1.0,
      USDT: 1.0,
    };

    return mockPrices[symbol] || 1.0;
  }

  private async getPriceChange24h(token: string): Promise<number> {
    // Mock 24h price changes - in production, calculate from historical data
    return (Math.random() - 0.5) * 0.1; // Random -5% to +5%
  }

  private async getTokenVolatility(token: string): Promise<number> {
    // Mock volatility calculation - in production, calculate from price history
    const volatilities: Record<string, number> = {
      AAVE: 0.15,
      WETH: 0.12,
      WBTC: 0.1,
      LINK: 0.18,
    };

    const symbol = this.getTokenSymbol(token);
    return volatilities[symbol] || 0.2;
  }

  private async getTokenYields(token: string): Promise<YieldData[]> {
    // Mock yield data - in production, fetch from actual protocols
    const baseYields: Record<string, YieldData[]> = {
      AAVE: [
        {
          protocol: 'Aave V3',
          apy: 0.035,
          tvl: 1000000,
          riskLevel: 'LOW',
          lastUpdated: new Date(),
        },
        {
          protocol: 'Compound',
          apy: 0.028,
          tvl: 800000,
          riskLevel: 'LOW',
          lastUpdated: new Date(),
        },
      ],
      WETH: [
        {
          protocol: 'Aave V3',
          apy: 0.025,
          tvl: 5000000,
          riskLevel: 'LOW',
          lastUpdated: new Date(),
        },
        {
          protocol: 'Yearn',
          apy: 0.045,
          tvl: 2000000,
          riskLevel: 'MEDIUM',
          lastUpdated: new Date(),
        },
      ],
      WBTC: [
        {
          protocol: 'Aave V3',
          apy: 0.015,
          tvl: 3000000,
          riskLevel: 'LOW',
          lastUpdated: new Date(),
        },
        {
          protocol: 'Compound',
          apy: 0.012,
          tvl: 1500000,
          riskLevel: 'LOW',
          lastUpdated: new Date(),
        },
      ],
      LINK: [
        {
          protocol: 'Aave V3',
          apy: 0.04,
          tvl: 500000,
          riskLevel: 'MEDIUM',
          lastUpdated: new Date(),
        },
      ],
    };

    const symbol = this.getTokenSymbol(token);
    return baseYields[symbol] || [];
  }

  private async getTokenLiquidity(token: string): Promise<number> {
    // Mock liquidity data - in production, aggregate from DEXes
    const liquidities: Record<string, number> = {
      AAVE: 5000000,
      WETH: 50000000,
      WBTC: 25000000,
      LINK: 8000000,
    };

    const symbol = this.getTokenSymbol(token);
    return liquidities[symbol] || 1000000;
  }

  private calculateVolatilityIndex(tokenAnalyses: TokenAnalysis[]): number {
    if (tokenAnalyses.length === 0) return 0;

    const avgVolatility =
      tokenAnalyses.reduce((sum, analysis) => sum + analysis.volatility, 0) /
      tokenAnalyses.length;
    return Math.min(avgVolatility * 100, 100); // Scale to 0-100
  }

  private calculateTokenCorrelation(
    tokenA: string,
    tokenB: string,
  ): Promise<number> {
    // Mock correlation calculation - in production, calculate from price history
    return Promise.resolve((Math.random() - 0.5) * 2); // Random -1 to +1
  }

  private async getDEXRates(
    inputToken: string,
    outputToken: string,
    amounts: bigint[],
  ) {
    // Mock DEX rate fetching - in production, query actual DEX aggregators
    return {
      bestRate: 1.0,
      recommendedRoute: '1inch',
    };
  }

  private calculatePriceImpact(
    expectedRate: number,
    actualRate: number,
  ): number {
    return (actualRate - expectedRate) / expectedRate;
  }

  private async estimateSwapGasCost(
    inputToken: string,
    outputToken: string,
  ): Promise<number> {
    // Mock gas estimation - in production, use actual gas estimation
    return 0.005; // $5 in ETH equivalent
  }

  private calculateRiskAdjustedReturn(apy: number, riskLevel: string): number {
    const riskMultipliers: Record<string, number> = {
      LOW: 1.0,
      MEDIUM: 0.8,
      HIGH: 0.6,
    };

    return apy * (riskMultipliers[riskLevel] || 0.5);
  }

  private convertRiskLevelToScore(riskLevel: string): number {
    const scores: Record<string, number> = {
      LOW: 1,
      MEDIUM: 3,
      HIGH: 5,
    };

    return scores[riskLevel] || 5;
  }

  private calculateTokenRiskScore(
    volatility: number,
    liquidity: number,
  ): number {
    // Simple risk scoring: higher volatility + lower liquidity = higher risk
    const volatilityScore = Math.min(volatility * 10, 5); // 0-5 scale
    const liquidityScore =
      liquidity < 1000000 ? 3 : liquidity < 10000000 ? 1 : 0;

    return Math.min(volatilityScore + liquidityScore, 5);
  }

  private getTokenSymbol(token: string): string {
    // Extract symbol from token address or return as-is if already a symbol
    const symbolMap: Record<string, string> = {
      '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': 'AAVE',
      '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': 'WETH',
      '0x29f2D40B0605204364af54EC677bD022dA425d03': 'WBTC',
      '0x779877A7B0D9E8603169DdbD7836e478b4624789': 'LINK',
    };

    return symbolMap[token] || token;
  }

  private async getCachedData(
    key: string,
  ): Promise<MarketDataCacheDocument | null> {
    return this.marketDataCacheModel.findOne({ key }).exec();
  }

  private isCacheValid(
    cache: MarketDataCacheDocument,
    maxAgeSeconds: number,
  ): boolean {
    const ageSeconds = (Date.now() - cache.timestamp.getTime()) / 1000;
    return ageSeconds < maxAgeSeconds;
  }

  private async cacheData(
    key: string,
    data: any,
    ttlSeconds: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.marketDataCacheModel
      .findOneAndUpdate(
        { key },
        {
          key,
          data,
          timestamp: new Date(),
          expiresAt,
        },
        { upsert: true },
      )
      .exec();
  }

  /**
   * Get multiple token prices efficiently using Chainlink
   */
  async getMultipleTokenPrices(
    tokens: string[],
  ): Promise<Record<string, number>> {
    try {
      const chainId =
        this.configService.get<number>('config.blockchain.chainId') || 11155111;

      // Convert token addresses to symbols
      const symbols = tokens.map((token) => this.getTokenSymbol(token));

      this.logger.log(
        `🔗 Fetching Chainlink prices for ${symbols.length} tokens: ${symbols.join(', ')}`,
      );

      // Get prices from Chainlink
      const priceDataMap =
        await this.chainlinkPriceFeedService.getMultipleTokenPrices(
          symbols,
          chainId,
        );

      // Convert PriceData objects to simple number prices
      const priceMap: Record<string, number> = {};

      symbols.forEach((symbol) => {
        const priceData = priceDataMap[symbol];
        if (priceData) {
          priceMap[symbol] = priceData.price;

          if (priceData.isStale) {
            this.logger.warn(
              `⚠️ Stale price for ${symbol}: $${priceData.price.toFixed(2)} (${priceData.staleness}s old)`,
            );
          }
        } else {
          // Use fallback price
          const fallbackPrice = this.getMockPrice(symbol);
          priceMap[symbol] = fallbackPrice;
          this.logger.warn(
            `❌ No Chainlink price for ${symbol}, using fallback: $${fallbackPrice.toFixed(2)}`,
          );
        }
      });

      return priceMap;
    } catch (error) {
      this.logger.error(
        `❌ Failed to get multiple token prices: ${error.message}`,
      );

      // Fallback to individual mock prices
      const priceMap: Record<string, number> = {};
      const symbols = tokens.map((token) => this.getTokenSymbol(token));

      symbols.forEach((symbol) => {
        priceMap[symbol] = this.getMockPrice(symbol);
      });

      return priceMap;
    }
  }

  /**
   * Validate price against Chainlink feeds with deviation threshold
   */
  async validateTokenPrice(
    symbol: string,
    expectedPrice: number,
    deviationThreshold: number = 0.05, // 5% default
  ): Promise<{
    isValid: boolean;
    deviation: number;
    chainlinkPrice: number;
    warnings: string[];
  }> {
    try {
      const chainId =
        this.configService.get<number>('config.blockchain.chainId') || 11155111;

      const validationResult =
        await this.chainlinkPriceFeedService.validatePriceData(
          symbol,
          expectedPrice,
          chainId,
        );

      const deviation =
        Math.abs(expectedPrice - validationResult.price) /
        validationResult.price;
      const isValid =
        validationResult.isValid && deviation <= deviationThreshold;

      const warnings = [...validationResult.warnings];
      if (deviation > deviationThreshold) {
        warnings.push(
          `Price deviation ${(deviation * 100).toFixed(2)}% exceeds threshold ${(deviationThreshold * 100).toFixed(2)}%`,
        );
      }

      return {
        isValid,
        deviation,
        chainlinkPrice: validationResult.price,
        warnings,
      };
    } catch (error) {
      this.logger.error(
        `❌ Price validation failed for ${symbol}: ${error.message}`,
      );
      return {
        isValid: false,
        deviation: 1.0, // 100% deviation indicates failure
        chainlinkPrice: 0,
        warnings: [`Validation failed: ${error.message}`],
      };
    }
  }
}
