import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ValidationPipe,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AIYieldOptimizationService } from '../services/ai-yield-optimization.service';
import { ChainlinkDataService } from '../../market-analysis/services/chainlink-data.service';
import { PerformanceTrackingService } from '../../performance-tracking/services/performance-tracking.service';
import {
  OptimizeDepositDto,
  OptimizationStrategyDto,
  TokenAllocationDto,
} from '../dto/optimize-deposit.dto';
import { ExecuteOptimizationDto } from '../dto/execute-optimization.dto';
import { MarketAnalysisDto } from '../dto/market-analysis.dto';
import { PortfolioPerformanceDto } from '../dto/portfolio-performance.dto';

@ApiTags('AI Optimization')
@Controller('ai-optimization')
export class AIOptimizationController {
  private readonly logger = new Logger(AIOptimizationController.name);

  constructor(
    private readonly aiOptimizationService: AIYieldOptimizationService,
    private readonly chainlinkService: ChainlinkDataService,
    private readonly performanceService: PerformanceTrackingService,
  ) {}

  @Post('optimize-deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate AI-optimized deposit strategy',
    description:
      'Analyze market conditions and generate optimal cross-token allocation strategy for a deposit',
  })
  @ApiBody({ type: OptimizeDepositDto })
  @ApiResponse({
    status: 200,
    description: 'Optimization strategy generated successfully',
    type: OptimizationStrategyDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Optimization failed due to internal error',
  })
  async optimizeDeposit(
    @Body(ValidationPipe) request: OptimizeDepositDto,
  ): Promise<OptimizationStrategyDto> {
    this.logger.log(
      `Optimize deposit request: ${request.userAddress} depositing ${request.inputAmount} ${request.inputToken}`,
    );

    try {
      const strategy =
        await this.aiOptimizationService.optimizeDeposit(request);

      this.logger.log(
        `Strategy generated for ${request.userAddress}: ${strategy.expectedAPY}% APY, ${strategy.confidence}% confidence`,
      );

      return strategy;
    } catch (error) {
      this.logger.error(`Optimization failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('execute-optimization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute AI-optimized deposit strategy',
    description:
      'Execute the cross-token swaps and protocol deposits for an optimization strategy',
  })
  @ApiBody({ type: ExecuteOptimizationDto })
  @ApiResponse({
    status: 200,
    description: 'Strategy executed successfully',
    schema: {
      type: 'object',
      properties: {
        operationId: { type: 'string' },
        executionStatus: {
          type: 'string',
          enum: ['SUCCESS', 'FAILED', 'PARTIAL'],
        },
        transactionHashes: { type: 'array', items: { type: 'string' } },
        totalGasUsed: { type: 'string' },
        totalGasCostUSD: { type: 'number' },
        executionTimeMs: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired strategy',
  })
  @ApiResponse({
    status: 500,
    description: 'Execution failed',
  })
  async executeOptimization(
    @Body(ValidationPipe) request: ExecuteOptimizationDto,
  ): Promise<any> {
    this.logger.log(`Execute optimization request: ${request.operationId}`);

    try {
      const result = await this.aiOptimizationService.executeOptimizedDeposit(
        request.strategy,
      );

      this.logger.log(
        `Strategy executed: ${request.operationId} - ${result.executionStatus}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Execution failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('market-analysis')
  @ApiOperation({
    summary: 'Get comprehensive market analysis',
    description:
      'Retrieve real-time market data including prices, yields, volatility, and correlations',
  })
  @ApiQuery({
    name: 'tokens',
    description: 'Comma-separated list of token addresses',
    required: true,
    type: String,
    example:
      '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9,0x6B175474E89094C44Da98b954EedeAC495271d0F',
  })
  @ApiResponse({
    status: 200,
    description: 'Market analysis data',
    type: MarketAnalysisDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token addresses',
  })
  async getMarketAnalysis(
    @Query('tokens') tokensQuery: string,
  ): Promise<MarketAnalysisDto> {
    const tokens = tokensQuery.split(',').map((token) => token.trim());

    this.logger.log(`Market analysis request for ${tokens.length} tokens`);

    try {
      const analysis = await this.chainlinkService.getMarketAnalysis(tokens);

      return {
        tokens: analysis.tokens.map((t) => t.token),
        pricesUSD: analysis.tokens.map((t) => t.currentPrice.toString()),
        expectedYields: analysis.tokens.map((t) =>
          t.yields.length > 0
            ? Math.round(t.yields[0].apy * 100).toString()
            : '0',
        ),
        volatilityScores: analysis.tokens.map((t) =>
          Math.round(t.volatility * 100).toString(),
        ),
        riskScores: analysis.tokens.map((t) => t.riskScore.toString()),
        correlationMatrix: this.buildCorrelationMatrix(
          analysis.correlations,
          analysis.tokens,
        ),
        timestamp: analysis.timestamp,
        dataFreshness: this.calculateDataFreshness(analysis.timestamp),
      };
    } catch (error) {
      this.logger.error(
        `Market analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('portfolio/:userId/performance')
  @ApiOperation({
    summary: 'Get user portfolio performance metrics',
    description:
      'Retrieve detailed performance analytics for a user portfolio including AI decision accuracy',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID or wallet address',
    type: String,
  })
  @ApiQuery({
    name: 'timeframe',
    description: 'Performance timeframe',
    required: false,
    enum: ['24h', '7d', '30d', '90d', 'all'],
    example: '30d',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio performance data',
    type: PortfolioPerformanceDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Portfolio not found',
  })
  async getPortfolioPerformance(
    @Param('userId') userId: string,
    @Query('timeframe') timeframe: string = '30d',
  ): Promise<PortfolioPerformanceDto> {
    this.logger.log(`Portfolio performance request: ${userId} (${timeframe})`);

    try {
      const performance =
        await this.performanceService.generatePerformanceReport(
          userId,
          timeframe,
        );

      return performance;
    } catch (error) {
      this.logger.error(
        `Performance analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('validate-swap')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate swap rates against Chainlink prices',
    description:
      'Verify that DEX swap rates are within acceptable slippage limits compared to Chainlink oracle prices',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['inputToken', 'outputToken', 'inputAmount', 'expectedOutput'],
      properties: {
        inputToken: { type: 'string', description: 'Input token address' },
        outputToken: { type: 'string', description: 'Output token address' },
        inputAmount: { type: 'string', description: 'Input amount in wei' },
        expectedOutput: {
          type: 'string',
          description: 'Expected output amount in wei',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Swap validation result',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        slippagePercent: { type: 'number' },
        maxAllowedSlippage: { type: 'number' },
        oraclePrice: { type: 'string' },
        marketPrice: { type: 'string' },
      },
    },
  })
  async validateSwap(
    @Body()
    params: {
      inputToken: string;
      outputToken: string;
      inputAmount: string;
      expectedOutput: string;
    },
  ): Promise<any> {
    this.logger.log(
      `Swap validation: ${params.inputToken} -> ${params.outputToken}`,
    );

    try {
      const validation = await this.chainlinkService.validateSwapRates(
        params.inputToken,
        params.outputToken,
        [BigInt(params.inputAmount)],
      );

      return validation;
    } catch (error) {
      this.logger.error(
        `Swap validation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('rebalance-opportunities')
  @ApiOperation({
    summary: 'Get available rebalancing opportunities',
    description:
      'Analyze all portfolios for potential rebalancing opportunities based on market conditions',
  })
  @ApiQuery({
    name: 'minImprovement',
    description: 'Minimum yield improvement percentage to include',
    required: false,
    type: Number,
    example: 0.5,
  })
  @ApiResponse({
    status: 200,
    description: 'Rebalancing opportunities',
    schema: {
      type: 'object',
      properties: {
        opportunities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              currentAllocation: { type: 'object' },
              recommendedAllocation: { type: 'object' },
              expectedYieldImprovement: { type: 'number' },
              riskImpact: { type: 'number' },
              estimatedGasCost: { type: 'number' },
              confidence: { type: 'number' },
              reasoning: { type: 'string' },
            },
          },
        },
        totalOpportunities: { type: 'number' },
        totalPotentialYield: { type: 'number' },
      },
    },
  })
  async getRebalanceOpportunities(
    @Query('minImprovement') minImprovement: number = 0.5,
  ): Promise<any> {
    this.logger.log(
      `Rebalance opportunities analysis (min improvement: ${minImprovement}%)`,
    );

    try {
      // This would get active portfolios and analyze them
      const portfolios = await this.getActivePortfolios();
      const opportunities =
        await this.aiOptimizationService.analyzeRebalanceOpportunities(
          portfolios,
        );

      const filteredOpportunities = opportunities.filter(
        (opp) => opp.expectedYieldImprovement >= minImprovement,
      );

      const totalPotentialYield = filteredOpportunities.reduce(
        (sum, opp) => sum + opp.expectedYieldImprovement,
        0,
      );

      return {
        opportunities: filteredOpportunities,
        totalOpportunities: filteredOpportunities.length,
        totalPotentialYield,
      };
    } catch (error) {
      this.logger.error(
        `Rebalance analysis failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('supported-tokens')
  @ApiOperation({
    summary: 'Get list of supported tokens',
    description: 'Retrieve all tokens supported by the AI optimization system',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported tokens list',
    schema: {
      type: 'object',
      properties: {
        tokens: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              symbol: { type: 'string' },
              name: { type: 'string' },
              decimals: { type: 'number' },
              currentAPY: { type: 'number' },
              riskScore: { type: 'number' },
              liquidityRank: { type: 'number' },
              isActive: { type: 'boolean' },
            },
          },
        },
        totalTokens: { type: 'number' },
        lastUpdated: { type: 'string' },
      },
    },
  })
  async getSupportedTokens(): Promise<any> {
    this.logger.log('Supported tokens request');

    try {
      // This would fetch from market data cache
      const tokens = await this.getSupportedTokensFromCache();

      return {
        tokens,
        totalTokens: tokens.length,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get supported tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private calculateDataFreshness(timestamp: Date): number {
    const now = Date.now();
    const dataAge = (now - timestamp.getTime()) / (1000 * 60); // Age in minutes

    // Full freshness for data less than 5 minutes old, declining to 0% at 60 minutes
    return Math.max(100 - dataAge * 1.67, 0);
  }

  private async getActivePortfolios(): Promise<any[]> {
    // This would fetch active portfolios from database
    // Implementation depends on your user portfolio service
    return [];
  }

  private async getSupportedTokensFromCache(): Promise<any[]> {
    // This would fetch supported tokens from market data cache
    // Implementation depends on your market data service
    return [];
  }

  private buildCorrelationMatrix(
    correlations: any[],
    tokens: any[],
  ): number[][] {
    const size = tokens.length;
    const matrix: number[][] = Array(size)
      .fill(null)
      .map(() => Array(size).fill(0));

    // Fill diagonal with 1s (token correlation with itself)
    for (let i = 0; i < size; i++) {
      matrix[i][i] = 1.0;
    }

    // Fill correlation values
    correlations.forEach((correlation) => {
      const indexA = tokens.findIndex((t) => t.token === correlation.tokenA);
      const indexB = tokens.findIndex((t) => t.token === correlation.tokenB);

      if (indexA !== -1 && indexB !== -1) {
        matrix[indexA][indexB] = correlation.correlation;
        matrix[indexB][indexA] = correlation.correlation; // Symmetric matrix
      }
    });

    return matrix;
  }
}
