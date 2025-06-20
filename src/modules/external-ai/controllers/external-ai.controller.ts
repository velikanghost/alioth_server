import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ValidationPipe,
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
  ApiBody,
} from '@nestjs/swagger';
import { ExternalAIService } from '../services/external-ai.service';

// DTOs for external AI communication
export class OptimizationRequestDto {
  userAddress: string;
  inputToken: string;
  inputAmount: string;
  chainId: number;
  riskTolerance?: number;
  preferredProtocols?: string[];
}

export class OptimizationResponseDto {
  operationId: string;
  tokenAllocations: Array<{
    token: string;
    allocation: number;
    protocol: string;
    expectedAPY: number;
  }>;
  swapRoutes: Array<{
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    expectedOutput: string;
    route: any;
  }>;
  expectedAPY: number;
  riskScore: number;
  confidence: number;
  reasoning: string;
}

export class ExecutionRequestDto {
  operationId: string;
  userSignature: string;
  strategy: OptimizationResponseDto;
}

export class MarketDataRequestDto {
  tokens: string[];
  chainIds: number[];
  includeYields?: boolean;
  includeVolatility?: boolean;
  includeCorrelations?: boolean;
}

@ApiTags('External AI Communication')
@Controller('external-ai')
export class ExternalAIController {
  private readonly logger = new Logger(ExternalAIController.name);

  constructor(private readonly externalAIService: ExternalAIService) {}

  @Post('market-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Provide market data to external AI service',
    description: 'Returns current market data for AI optimization analysis',
  })
  @ApiBody({ type: MarketDataRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Market data provided successfully',
  })
  async provideMarketData(
    @Body(ValidationPipe) request: MarketDataRequestDto,
  ): Promise<any> {
    this.logger.log(
      `Market data request for ${request.tokens.length} tokens across ${request.chainIds.length} chains`,
    );

    return this.externalAIService.getMarketDataForAI(request);
  }

  @Post('portfolio-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Provide portfolio data to external AI service',
    description: 'Returns current portfolio data for AI optimization analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio data provided successfully',
  })
  async providePortfolioData(
    @Query('userAddress') userAddress: string,
    @Query('chainId') chainId?: number,
  ): Promise<any> {
    this.logger.log(`Portfolio data request for ${userAddress}`);

    return this.externalAIService.getPortfolioDataForAI(userAddress, chainId);
  }

  @Post('execute-optimization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute AI optimization strategy',
    description: 'Execute the optimization strategy provided by external AI',
  })
  @ApiBody({ type: ExecutionRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Strategy executed successfully',
  })
  async executeOptimization(
    @Body(ValidationPipe) request: ExecutionRequestDto,
  ): Promise<any> {
    this.logger.log(`Execute optimization request: ${request.operationId}`);

    return this.externalAIService.executeOptimizationStrategy(request);
  }

  @Get('supported-tokens')
  @ApiOperation({
    summary: 'Get supported tokens',
    description: 'Returns list of supported tokens across all chains',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported tokens list',
  })
  async getSupportedTokens(@Query('chainId') chainId?: number): Promise<any> {
    this.logger.log('Supported tokens request');

    return this.externalAIService.getSupportedTokens(chainId);
  }

  @Get('supported-protocols')
  @ApiOperation({
    summary: 'Get supported protocols',
    description: 'Returns list of supported DeFi protocols',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported protocols list',
  })
  async getSupportedProtocols(
    @Query('chainId') chainId?: number,
  ): Promise<any> {
    this.logger.log('Supported protocols request');

    return this.externalAIService.getSupportedProtocols(chainId);
  }

  @Post('validate-strategy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate optimization strategy',
    description:
      'Validate the AI-generated optimization strategy before execution',
  })
  @ApiResponse({
    status: 200,
    description: 'Strategy validation result',
  })
  async validateStrategy(
    @Body() strategy: OptimizationResponseDto,
  ): Promise<any> {
    this.logger.log(`Strategy validation request: ${strategy.operationId}`);

    return this.externalAIService.validateOptimizationStrategy(strategy);
  }

  @Get('gas-estimates')
  @ApiOperation({
    summary: 'Get gas estimates',
    description: 'Returns current gas estimates for different operations',
  })
  @ApiResponse({
    status: 200,
    description: 'Gas estimates data',
  })
  async getGasEstimates(@Query('chainId') chainId?: number): Promise<any> {
    this.logger.log('Gas estimates request');

    return this.externalAIService.getGasEstimates(chainId);
  }

  @Post('log-ai-decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log AI decision for analytics',
    description:
      'Store AI decision data for performance tracking and analytics',
  })
  @ApiResponse({
    status: 200,
    description: 'AI decision logged successfully',
  })
  async logAIDecision(@Body() decisionData: any): Promise<any> {
    this.logger.log(`AI decision log: ${decisionData.operationId}`);

    return this.externalAIService.logAIDecision(decisionData);
  }

  @Get('performance-metrics')
  @ApiOperation({
    summary: 'Get AI performance metrics',
    description: 'Returns AI decision accuracy and performance metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics data',
  })
  async getPerformanceMetrics(
    @Query('timeframe') timeframe: string = '30d',
  ): Promise<any> {
    this.logger.log('Performance metrics request');

    return this.externalAIService.getAIPerformanceMetrics(timeframe);
  }
}
