import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
  ApiBody,
} from '@nestjs/swagger';
import { AgentCommunicationService } from '../services/agent-communication.service';

import {
  OptimizeDepositDto,
  OptimizationResponse,
  DemoStatusResponse,
  RiskTolerance,
  AIPortfolioOptimizationRequestDto,
  AIOptimizationResponseDto,
  AIOptimizationDataResponse,
  SUPPORTED_TOKENS,
  SupportedTokenSymbol,
} from '../dto/optimization.dto';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('ai-optimization')
@Controller('ai-optimization')
export class AIOptimizationController {
  private readonly logger = new Logger(AIOptimizationController.name);

  constructor(
    private readonly agentCommunicationService: AgentCommunicationService,
  ) {}

  @Post('optimize-deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Optimize deposit allocation using AI analysis',
    description:
      'Coordinates AI analysis with smart contract execution for yield optimization',
  })
  @ApiBody({ type: OptimizeDepositDto })
  @ApiResponse({
    status: 200,
    description: 'Optimization strategy executed successfully',
    type: OptimizationResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during optimization',
  })
  async optimizeDeposit(
    @Body(ValidationPipe) request: OptimizeDepositDto,
  ): Promise<OptimizationResponse> {
    const trackingId = uuidv4();
    this.logger.log(
      `🚀 Starting deposit optimization - Tracking ID: ${trackingId}`,
    );

    try {
      // Step 1: Validate user input and supported tokens
      await this.validateOptimizationRequest(request);

      if (
        !this.isSupportedToken(
          request.inputTokenSymbol,
          request.inputTokenAddress,
        )
      ) {
        throw new Error(
          `Unsupported token: ${request.inputTokenSymbol}. Supported tokens: ${Object.keys(SUPPORTED_TOKENS).join(', ')}`,
        );
      }

      // Step 4: Call AI agent for optimization recommendation
      this.logger.log('🤖 Calling AI agent for optimization recommendation');
      const aiResponse = await fetch(
        'http://localhost:3001/api/v1/direct-deposit-optimization',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputTokenAddress: request.inputTokenAddress,
            inputTokenSymbol: request.inputTokenSymbol,
            inputTokenAmount: request.inputTokenAmount,
            usdAmount: request.usdAmount,
            riskTolerance: request.riskTolerance,
          }),
        },
      );

      if (!aiResponse.ok) {
        throw new Error(
          `AI agent responded with status: ${aiResponse.status} ${aiResponse.statusText}`,
        );
      }

      const aiData = await aiResponse.json();

      if (!aiData.success) {
        throw new Error(
          `AI optimization failed: ${aiData.data?.optimization?.reasoning || 'Unknown error'}`,
        );
      }

      this.logger.log('✅ AI optimization recommendation received');

      // Step 5: Execute vault deposits for each recommendation
      this.logger.log(
        `💰 Executing ${aiData.data.optimization.recommendations.length} vault deposits`,
      );
      return aiData;
    } catch (error) {
      this.logger.error(
        `❌ Optimization failed for tracking ID ${trackingId}: ${error.message}`,
        error.stack,
      );

      // Return error response
      return {
        success: false,
        transactionHash: '',
        strategy: [],
        estimatedAPY: 0,
        reasoning: `Optimization failed: ${error.message}`,
        trackingId,
      };
    }
  }

  @Post('portfolio-optimization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI Portfolio Optimization',
    description: 'Get AI-driven portfolio optimization recommendations',
  })
  @ApiBody({ type: AIPortfolioOptimizationRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Portfolio optimization completed successfully',
    type: AIOptimizationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during optimization',
  })
  async portfolioOptimization(
    @Body(ValidationPipe) request: AIPortfolioOptimizationRequestDto,
  ): Promise<AIOptimizationResponseDto> {
    this.logger.log(
      `🤖 AI Portfolio Optimization request: "${request.content.text}" - ${request.content.inputToken} ${request.content.inputAmount}`,
    );

    try {
      // Call AI agent for portfolio optimization
      const aiData: AIOptimizationDataResponse =
        await this.agentCommunicationService.requestPortfolioOptimization(
          request.content,
        );

      this.logger.log(
        `✅ AI Portfolio Optimization completed with ${aiData.confidence}% confidence`,
      );

      return {
        success: true,
        data: aiData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ Portfolio optimization failed: ${error.message}`,
        error.stack,
      );

      // Return error response
      return {
        success: false,
        data: {
          allocation: { stablecoins: 0, bluechip: 0, riskAssets: 0 },
          expectedAPY: 0,
          protocols: [],
          confidence: 0,
          reasoning: `Portfolio optimization failed: ${error.message}`,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('demo/status/:trackingId')
  @ApiOperation({
    summary: 'Get demo status for tracking ID',
    description: 'Returns current status of optimization for demo purposes',
  })
  @ApiParam({
    name: 'trackingId',
    description: 'Unique tracking ID from optimization request',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo status retrieved successfully',
  })
  async getDemoStatus(
    @Param('trackingId') trackingId: string,
  ): Promise<DemoStatusResponse> {
    this.logger.log(`📋 Getting demo status for tracking ID: ${trackingId}`);

    try {
      // For MVP demo, return mock status
      // In production, this would query the database for actual status
      return {
        stage: 'automation_registered',
        chainlinkEvents: [
          {
            eventType: 'automation_trigger',
            transactionHash: '0x123...',
            blockNumber: 12345,
            timestamp: new Date(),
          },
        ],
        currentPerformance: {
          totalValue: 1050.25,
          totalReturn: 50.25,
          apy: 5.2,
          riskScore: 3,
          lastUpdate: new Date(),
        },
        nextRebalanceEstimate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    } catch (error) {
      this.logger.error(`Failed to get demo status: ${error.message}`);
      throw error;
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check for AI optimization service',
    description: 'Checks connectivity to AI agents and smart contracts',
  })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
  })
  async healthCheck(): Promise<{
    status: string;
    aiAgent: boolean;
    smartContract: boolean;
    timestamp: Date;
  }> {
    this.logger.log('🏥 Performing health check');

    try {
      // Check AI agent connectivity
      const aiAgentHealthy = await this.agentCommunicationService.pingAIAgent();

      // Check smart contract connectivity (simplified)
      const contractHealthy = true; // Would check actual contract connectivity

      const overallHealthy = aiAgentHealthy && contractHealthy;

      return {
        status: overallHealthy ? 'healthy' : 'degraded',
        aiAgent: aiAgentHealthy,
        smartContract: contractHealthy,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        aiAgent: false,
        smartContract: false,
        timestamp: new Date(),
      };
    }
  }

  @Get('supported-tokens')
  @ApiOperation({
    summary: 'Get list of supported tokens for direct deposit',
    description: 'Returns all tokens supported for direct deposit optimization',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported tokens retrieved successfully',
  })
  async getSupportedTokens(): Promise<{
    tokens: Array<{
      symbol: string;
      address: string;
    }>;
  }> {
    this.logger.log('📋 Getting supported tokens list');

    const tokens = Object.entries(SUPPORTED_TOKENS).map(
      ([symbol, address]) => ({
        symbol,
        address,
      }),
    );

    return { tokens };
  }

  private async validateOptimizationRequest(
    request: OptimizeDepositDto,
  ): Promise<void> {
    // Validate user address format
    // if (!request.userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    //   throw new Error('Invalid user address format');
    // }

    // Validate token address format
    if (!request.inputTokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid token address format');
    }

    // Validate token symbol
    if (!request.inputTokenSymbol.match(/^[A-Z]+$/)) {
      throw new Error('Invalid token symbol format');
    }

    // Validate input amount
    const amount = parseFloat(request.inputTokenAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid input amount');
    }

    // Validate risk tolerance
    if (!Object.values(RiskTolerance).includes(request.riskTolerance)) {
      throw new Error('Invalid risk tolerance level');
    }

    this.logger.log('✅ Input validation passed');
  }

  private isSupportedToken(symbol: string, address: string): boolean {
    const expectedAddress = SUPPORTED_TOKENS[symbol as SupportedTokenSymbol];
    return (
      expectedAddress !== undefined &&
      expectedAddress.toLowerCase() === address.toLowerCase()
    );
  }
}
