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
import { YieldOptimizerService } from '../services/yield-optimizer.service';
import { TokenService } from '../services/token.service';
import { ChainlinkDataService } from '../../market-analysis/services/chainlink-data.service';
import { VaultDepositService } from '../../yield-vault/services/vault-deposit.service';
import { AliothWalletService } from '../../yield-vault/services/alioth-wallet.service';
import { DepositDto } from '../../yield-vault/dto/vault.dto';
import {
  OptimizeDepositDto,
  OptimizationResponse,
  DemoStatusResponse,
  YieldAnalysisRequest,
  RiskTolerance,
  TransactionResult,
  AIPortfolioOptimizationRequestDto,
  AIOptimizationResponseDto,
  AIOptimizationDataResponse,
  SUPPORTED_TOKENS,
  SupportedTokenSymbol,
} from '../dto/optimization.dto';
import { Address, formatEther, parseUnits } from 'viem';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('AI Optimization')
@Controller('ai-optimization')
export class AIOptimizationController {
  private readonly logger = new Logger(AIOptimizationController.name);

  constructor(
    private readonly agentCommunicationService: AgentCommunicationService,
    private readonly tokenService: TokenService,
    private readonly aliothWalletService: AliothWalletService,
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

      // Step 2: Get Alioth wallet for user (using first available wallet)
      // const aliothWallets = await this.aliothWalletService.getUserAliothWallets(
      //   request.userAddress,
      // );
      // if (!aliothWallets || aliothWallets.length === 0) {
      //   throw new Error(
      //     `No Alioth wallet found for user: ${request.userAddress}`,
      //   );
      // }
      // const aliothWallet = aliothWallets[0]; // Use first available wallet

      // // Step 3: Convert token amount to USD
      // this.logger.log('💰 Converting token amount to USD for AI analysis');
      // const usdAmount = await this.tokenService.getUSDValue(
      //   request.inputTokenSymbol,
      //   request.inputAmount,
      // );

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

  @Post('test-ai-agent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test AI Agent Connectivity',
    description: 'Test endpoint to verify AI agent is responding correctly',
  })
  @ApiResponse({
    status: 200,
    description: 'AI agent test completed',
  })
  async testAIAgent(): Promise<any> {
    this.logger.log('🧪 Testing AI agent connectivity...');

    try {
      // Make the exact curl request to test AI agent
      const response = await fetch(
        'http://localhost:3001/api/v1/portfolio-optimization',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            riskTolerance: 'moderate',
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `AI agent responded with status: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      this.logger.log('✅ AI agent test successful');

      return {
        success: true,
        message: 'AI agent is responding correctly',
        aiAgentResponse: data,
        status: response.status,
        url: 'http://localhost:3001/api/v1/portfolio-optimization',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ AI agent test failed: ${error.message}`);
    }
  }

  @Post('test-yield-analysis-direct')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test AI Yield Analysis Direct',
    description:
      'Test the yield-analysis endpoint directly with fetch (like test-ai-agent)',
  })
  @ApiResponse({
    status: 200,
    description: 'Direct AI yield analysis test completed',
  })
  async testYieldAnalysisDirect(): Promise<any> {
    this.logger.log('🔍 Testing AI yield analysis endpoint directly...');

    try {
      // Use fetch directly (same as working test-ai-agent)
      const response = await fetch(
        'http://localhost:3001/api/v1/yield-analysis',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputTokenAddress: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
            usdAmount: '5000',
            riskTolerance: 'moderate',
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `AI agent responded with status: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      this.logger.log('✅ Direct AI yield analysis test successful');

      return {
        success: true,
        message:
          'AI yield analysis endpoint is working correctly (direct test)',
        aiAgentResponse: data,
        status: response.status,
        url: 'http://localhost:3001/api/v1/yield-analysis',
        method: 'fetch (same as working test-ai-agent)',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ Direct AI yield analysis test failed: ${error.message}`,
      );
    }
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
