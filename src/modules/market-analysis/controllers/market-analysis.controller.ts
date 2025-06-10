import { Controller, Get, Query, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import {
  ChainlinkDataService,
  MarketAnalysis,
  SwapValidation,
  YieldComparison,
} from '../services/chainlink-data.service';
import {
  ChainlinkPriceFeedService,
  PriceData,
} from '../services/chainlink-price-feed.service';

export class MarketAnalysisQueryDto {
  tokens: string[];
}

export class SwapValidationDto {
  inputToken: string;
  outputToken: string;
  amounts: string[]; // Array of bigint amounts as strings
}

export class YieldComparisonDto {
  tokens: string[];
  amounts: string[]; // Array of bigint amounts as strings
}

export class PriceValidationDto {
  symbol: string;
  expectedPrice: number;
  chainId?: number;
  deviationThreshold?: number;
}

export class MultiTokenPriceDto {
  symbols: string[];
  chainId?: number;
}

@ApiTags('Market Analysis')
@Controller('market-analysis')
export class MarketAnalysisController {
  private readonly logger = new Logger(MarketAnalysisController.name);

  constructor(
    private readonly chainlinkDataService: ChainlinkDataService,
    private readonly chainlinkPriceFeedService: ChainlinkPriceFeedService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get comprehensive market analysis',
    description:
      'Fetch real-time market analysis including token prices, yields, correlations, and market conditions',
  })
  @ApiQuery({
    name: 'tokens',
    description: 'Comma-separated list of token addresses or symbols',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Market analysis data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        tokens: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              symbol: { type: 'string' },
              currentPrice: { type: 'number' },
              priceChange24h: { type: 'number' },
              volatility: { type: 'number' },
              liquidityUSD: { type: 'number' },
              yields: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    protocol: { type: 'string' },
                    apy: { type: 'number' },
                    tvl: { type: 'number' },
                    riskLevel: {
                      type: 'string',
                      enum: ['LOW', 'MEDIUM', 'HIGH'],
                    },
                    lastUpdated: { type: 'string', format: 'date-time' },
                  },
                },
              },
              riskScore: { type: 'number' },
            },
          },
        },
        marketConditions: {
          type: 'object',
          properties: {
            trend: { type: 'string', enum: ['BULLISH', 'BEARISH', 'SIDEWAYS'] },
            volatilityLevel: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH'],
            },
            liquidityCondition: {
              type: 'string',
              enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'],
            },
            fearGreedIndex: { type: 'number' },
            defiTvl: { type: 'number' },
          },
        },
        correlations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tokenA: { type: 'string' },
              tokenB: { type: 'string' },
              correlation: { type: 'number' },
              timeframe: { type: 'string' },
            },
          },
        },
        volatilityIndex: { type: 'number' },
        liquidityMetrics: {
          type: 'object',
          properties: {
            totalLiquidity: { type: 'number' },
            averageSlippage: { type: 'number' },
            liquidityDistribution: { type: 'object' },
          },
        },
      },
    },
  })
  async getMarketAnalysis(
    @Query('tokens') tokensParam: string,
  ): Promise<MarketAnalysis> {
    this.logger.log(`Fetching market analysis for tokens: ${tokensParam}`);

    const tokens = tokensParam.split(',').map((token) => token.trim());

    if (tokens.length === 0) {
      throw new Error('At least one token must be specified');
    }

    return this.chainlinkDataService.getMarketAnalysis(tokens);
  }

  @Post('validate-swap')
  @ApiOperation({
    summary: 'Validate swap rates and slippage',
    description:
      'Validate swap rates against Chainlink price feeds and estimate slippage and gas costs',
  })
  @ApiResponse({
    status: 200,
    description: 'Swap validation completed',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        priceImpact: { type: 'number' },
        slippage: { type: 'number' },
        gasCost: { type: 'number' },
        warnings: { type: 'array', items: { type: 'string' } },
        recommendedRoute: { type: 'string' },
      },
    },
  })
  async validateSwapRates(
    @Body() dto: SwapValidationDto,
  ): Promise<SwapValidation> {
    this.logger.log(`Validating swap: ${dto.inputToken} -> ${dto.outputToken}`);

    const amounts = dto.amounts.map((amount) => BigInt(amount));

    return this.chainlinkDataService.validateSwapRates(
      dto.inputToken,
      dto.outputToken,
      amounts,
    );
  }

  @Post('yield-comparison')
  @ApiOperation({
    summary: 'Compare yields across tokens and protocols',
    description:
      'Get comprehensive yield comparison with risk-adjusted returns across different tokens and DeFi protocols',
  })
  @ApiResponse({
    status: 200,
    description: 'Yield comparison data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        comparisons: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              protocol: { type: 'string' },
              apy: { type: 'number' },
              tvl: { type: 'number' },
              riskScore: { type: 'number' },
              liquidity: { type: 'number' },
              riskAdjustedReturn: { type: 'number' },
            },
          },
        },
        bestOpportunity: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            protocol: { type: 'string' },
            apy: { type: 'number' },
            tvl: { type: 'number' },
            riskScore: { type: 'number' },
            liquidity: { type: 'number' },
            riskAdjustedReturn: { type: 'number' },
          },
        },
        riskAdjustedBest: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            protocol: { type: 'string' },
            apy: { type: 'number' },
            tvl: { type: 'number' },
            riskScore: { type: 'number' },
            liquidity: { type: 'number' },
            riskAdjustedReturn: { type: 'number' },
          },
        },
      },
    },
  })
  async getYieldComparison(
    @Body() dto: YieldComparisonDto,
  ): Promise<YieldComparison> {
    this.logger.log(
      `Fetching yield comparison for tokens: ${dto.tokens.join(', ')}`,
    );

    const amounts = dto.amounts.map((amount) => BigInt(amount));

    return this.chainlinkDataService.getYieldComparison(dto.tokens, amounts);
  }

  @Get('tokens/:tokenAddress/price')
  @ApiOperation({
    summary: 'Get current token price',
    description:
      'Get current price for a specific token from Chainlink price feeds',
  })
  @ApiResponse({
    status: 200,
    description: 'Token price retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        symbol: { type: 'string' },
        price: { type: 'number' },
        priceChange24h: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getTokenPrice(@Query('tokenAddress') tokenAddress: string) {
    this.logger.log(`Fetching price for token: ${tokenAddress}`);

    // This is a simplified implementation - in production, would use actual Chainlink feeds
    const mockPrices: Record<
      string,
      { symbol: string; price: number; change24h: number }
    > = {
      '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': {
        symbol: 'AAVE',
        price: 85.5,
        change24h: 0.025,
      },
      '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': {
        symbol: 'WETH',
        price: 2300.0,
        change24h: -0.015,
      },
      '0x29f2D40B0605204364af54EC677bD022dA425d03': {
        symbol: 'WBTC',
        price: 42000.0,
        change24h: 0.008,
      },
      '0x779877A7B0D9E8603169DdbD7836e478b4624789': {
        symbol: 'LINK',
        price: 12.5,
        change24h: 0.032,
      },
    };

    const tokenData = mockPrices[tokenAddress];
    if (!tokenData) {
      throw new Error(`Price data not available for token: ${tokenAddress}`);
    }

    return {
      token: tokenAddress,
      symbol: tokenData.symbol,
      price: tokenData.price,
      priceChange24h: tokenData.change24h,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('protocols/:protocol/yields')
  @ApiOperation({
    summary: 'Get yields for a specific protocol',
    description:
      'Get current yield data for all supported tokens in a specific DeFi protocol',
  })
  @ApiResponse({
    status: 200,
    description: 'Protocol yields retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        protocol: { type: 'string' },
        lastUpdated: { type: 'string', format: 'date-time' },
        yields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              symbol: { type: 'string' },
              apy: { type: 'number' },
              tvl: { type: 'number' },
              riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            },
          },
        },
      },
    },
  })
  async getProtocolYields(@Query('protocol') protocol: string) {
    this.logger.log(`Fetching yields for protocol: ${protocol}`);

    // Mock protocol yields - in production, fetch from actual protocol APIs
    const mockYields: Record<string, any[]> = {
      'aave-v3': [
        {
          token: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
          symbol: 'AAVE',
          apy: 0.035,
          tvl: 1000000,
          riskLevel: 'LOW',
        },
        {
          token: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
          symbol: 'WETH',
          apy: 0.025,
          tvl: 5000000,
          riskLevel: 'LOW',
        },
        {
          token: '0x29f2D40B0605204364af54EC677bD022dA425d03',
          symbol: 'WBTC',
          apy: 0.015,
          tvl: 3000000,
          riskLevel: 'LOW',
        },
        {
          token: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
          symbol: 'LINK',
          apy: 0.04,
          tvl: 500000,
          riskLevel: 'MEDIUM',
        },
      ],
      compound: [
        {
          token: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
          symbol: 'AAVE',
          apy: 0.028,
          tvl: 800000,
          riskLevel: 'LOW',
        },
        {
          token: '0x29f2D40B0605204364af54EC677bD022dA425d03',
          symbol: 'WBTC',
          apy: 0.012,
          tvl: 1500000,
          riskLevel: 'LOW',
        },
      ],
      yearn: [
        {
          token: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
          symbol: 'WETH',
          apy: 0.045,
          tvl: 2000000,
          riskLevel: 'MEDIUM',
        },
      ],
    };

    const yields = mockYields[protocol.toLowerCase()];
    if (!yields) {
      throw new Error(`Yield data not available for protocol: ${protocol}`);
    }

    return {
      protocol,
      lastUpdated: new Date().toISOString(),
      yields,
    };
  }

  @Get('market-conditions')
  @ApiOperation({
    summary: 'Get current market conditions',
    description:
      'Get overall DeFi market conditions including trends, volatility, and fear/greed index',
  })
  @ApiResponse({
    status: 200,
    description: 'Market conditions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        trend: { type: 'string', enum: ['BULLISH', 'BEARISH', 'SIDEWAYS'] },
        volatilityLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        liquidityCondition: {
          type: 'string',
          enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'],
        },
        fearGreedIndex: { type: 'number' },
        defiTvl: { type: 'number' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getMarketConditions() {
    this.logger.log('Fetching current market conditions');

    // Mock market conditions - in production, aggregate from multiple sources
    return {
      trend: 'SIDEWAYS',
      volatilityLevel: 'MEDIUM',
      liquidityCondition: 'GOOD',
      fearGreedIndex: 52,
      defiTvl: 50000000000, // $50B
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('chainlink/price/:symbol')
  @ApiOperation({
    summary: 'Get real-time Chainlink price for a token',
    description:
      'Fetch current USD price for a token using Chainlink Data Feeds with staleness validation',
  })
  @ApiQuery({
    name: 'chainId',
    description: 'Blockchain chain ID (default: 11155111 for Sepolia)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Chainlink price data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        price: { type: 'number' },
        timestamp: { type: 'number' },
        roundId: { type: 'number' },
        decimals: { type: 'number' },
        symbol: { type: 'string' },
        isStale: { type: 'boolean' },
        staleness: { type: 'number' },
      },
    },
  })
  async getChainlinkPrice(
    @Query('symbol') symbol: string,
    @Query('chainId') chainId?: number,
  ): Promise<PriceData> {
    this.logger.log(
      `Fetching Chainlink price for ${symbol} on chain ${chainId || 11155111}`,
    );

    return this.chainlinkPriceFeedService.getTokenPriceUSD(
      symbol,
      chainId || 11155111,
    );
  }

  @Post('chainlink/prices/multiple')
  @ApiOperation({
    summary: 'Get multiple token prices from Chainlink in parallel',
    description:
      'Efficiently fetch USD prices for multiple tokens using Chainlink Data Feeds',
  })
  @ApiResponse({
    status: 200,
    description: 'Multiple Chainlink prices retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          price: { type: 'number' },
          timestamp: { type: 'number' },
          roundId: { type: 'number' },
          decimals: { type: 'number' },
          symbol: { type: 'string' },
          isStale: { type: 'boolean' },
          staleness: { type: 'number' },
        },
      },
    },
  })
  async getMultipleChainlinkPrices(
    @Body() dto: MultiTokenPriceDto,
  ): Promise<Record<string, PriceData>> {
    this.logger.log(
      `Fetching Chainlink prices for ${dto.symbols.length} tokens: ${dto.symbols.join(', ')}`,
    );

    return this.chainlinkPriceFeedService.getMultipleTokenPrices(
      dto.symbols,
      dto.chainId || 11155111,
    );
  }

  @Post('chainlink/validate-price')
  @ApiOperation({
    summary: 'Validate price against Chainlink feeds',
    description:
      'Compare an expected price with Chainlink oracle data and validate deviation threshold',
  })
  @ApiResponse({
    status: 200,
    description: 'Price validation completed',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        deviation: { type: 'number' },
        chainlinkPrice: { type: 'number' },
        warnings: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async validatePriceWithChainlink(@Body() dto: PriceValidationDto) {
    this.logger.log(
      `Validating price for ${dto.symbol}: expected $${dto.expectedPrice}`,
    );

    return this.chainlinkDataService.validateTokenPrice(
      dto.symbol,
      dto.expectedPrice,
      dto.deviationThreshold || 0.05,
    );
  }

  @Get('chainlink/historical/:symbol/:roundId')
  @ApiOperation({
    summary: 'Get historical Chainlink price data',
    description:
      'Fetch historical price data for a specific round from Chainlink feeds',
  })
  @ApiQuery({
    name: 'chainId',
    description: 'Blockchain chain ID (default: 11155111 for Sepolia)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Historical Chainlink price data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        price: { type: 'number' },
        timestamp: { type: 'number' },
        roundId: { type: 'number' },
        decimals: { type: 'number' },
        symbol: { type: 'string' },
        isStale: { type: 'boolean' },
        staleness: { type: 'number' },
        startedAt: { type: 'number' },
        answeredInRound: { type: 'number' },
      },
    },
  })
  async getHistoricalChainlinkPrice(
    @Query('symbol') symbol: string,
    @Query('roundId') roundId: number,
    @Query('chainId') chainId?: number,
  ) {
    this.logger.log(
      `Fetching historical Chainlink price for ${symbol} round ${roundId}`,
    );

    return this.chainlinkPriceFeedService.getHistoricalPriceData(
      symbol,
      roundId,
      chainId || 11155111,
    );
  }

  @Get('chainlink/supported-chains')
  @ApiOperation({
    summary: 'Get supported blockchain networks',
    description:
      'List all blockchain networks supported by the Chainlink price feed service',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported chains retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        chains: { type: 'array', items: { type: 'number' } },
        chainDetails: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              chainId: { type: 'number' },
              name: { type: 'string' },
              availableSymbols: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  async getSupportedChains() {
    this.logger.log('Fetching supported blockchain networks');

    const chains = this.chainlinkPriceFeedService.getSupportedChains();
    const chainDetails: Record<string, any> = {};

    for (const chainId of chains) {
      const availableSymbols =
        this.chainlinkPriceFeedService.getAvailableSymbols(chainId);
      chainDetails[chainId.toString()] = {
        chainId,
        name: this.getChainName(chainId),
        availableSymbols,
      };
    }

    return {
      chains,
      chainDetails,
    };
  }

  @Get('chainlink/feed-info/:symbol')
  @ApiOperation({
    summary: 'Get price feed configuration details',
    description:
      'Get detailed information about a Chainlink price feed including address and decimals',
  })
  @ApiQuery({
    name: 'chainId',
    description: 'Blockchain chain ID (default: 11155111 for Sepolia)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Price feed information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        decimals: { type: 'number' },
        description: { type: 'string' },
        symbol: { type: 'string' },
        heartbeat: { type: 'number' },
        threshold: { type: 'number' },
        liveDescription: { type: 'string' },
      },
    },
  })
  async getPriceFeedInfo(
    @Query('symbol') symbol: string,
    @Query('chainId') chainId?: number,
  ) {
    this.logger.log(`Fetching price feed info for ${symbol}`);

    const chainIdToUse = chainId || 11155111;
    const feedInfo = this.chainlinkPriceFeedService.getPriceFeedInfo(
      symbol,
      chainIdToUse,
    );

    if (!feedInfo) {
      throw new Error(
        `No price feed found for ${symbol} on chain ${chainIdToUse}`,
      );
    }

    try {
      const liveDescription =
        await this.chainlinkPriceFeedService.getFeedDescription(
          symbol,
          chainIdToUse,
        );
      return {
        ...feedInfo,
        liveDescription,
      };
    } catch (error) {
      return {
        ...feedInfo,
        liveDescription: 'Unable to fetch live description',
      };
    }
  }

  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      11155111: 'Ethereum Sepolia Testnet',
      84532: 'Base Sepolia Testnet',
    };

    return chainNames[chainId] || `Chain ${chainId}`;
  }
}
