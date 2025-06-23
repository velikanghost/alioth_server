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
  DirectDepositRequestDto,
  DirectDepositResponseDto,
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
    private readonly yieldOptimizerService: YieldOptimizerService,
    private readonly chainlinkDataService: ChainlinkDataService,
    private readonly tokenService: TokenService,
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
      `🚀 Starting deposit optimization for ${request.userAddress} - Tracking ID: ${trackingId}`,
    );

    try {
      // Step 1: Validate user input
      await this.validateOptimizationRequest(request);

      // Step 2: Convert token amount to USD
      this.logger.log('💰 Converting token amount to USD for AI analysis');
      const usdAmount = await this.tokenService.getUSDValue(
        request.inputTokenSymbol,
        request.inputAmount,
      );

      const aiResponse = await fetch(
        'http://localhost:3001/api/v1/yield-analysis',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputTokenAddress: request.inputTokenAddress,
            usdAmount: usdAmount,
            riskTolerance: request.riskTolerance,
          }),
        },
      );

      if (!aiResponse.ok) {
        throw new Error(
          `AI agent responded with status: ${aiResponse.status} ${aiResponse.statusText}`,
        );
      }

      const data = await aiResponse.json();

      this.logger.log('✅ Direct AI yield analysis test successful');

      // Step 3: Prepare contract call parameters
      const contractParams = {
        userAddress: request.userAddress as Address,
        inputToken: request.inputTokenAddress as Address,
        inputAmount: BigInt(request.inputAmount), // Already in wei from frontend
        allocations: data.allocation,
        maxSlippage: 0.005, // 0.5% default slippage
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour deadline
      };

      // Step 4: Execute optimization on smart contract
      this.logger.log('⛓️ Executing optimization on smart contract');
      const transactionResult: TransactionResult =
        await this.yieldOptimizerService.executeOptimizedDeposit(
          contractParams,
        );

      if (!transactionResult.success) {
        throw new Error(
          `Smart contract execution failed: ${transactionResult.error}`,
        );
      }

      // Step 5: Return optimization response
      const response: OptimizationResponse = {
        success: true,
        transactionHash: transactionResult.hash,
        strategy: data.allocation,
        estimatedAPY:
          data.estimatedAPY || this.calculateWeightedAPY(data.allocation),
        reasoning: data.reasoning,
        trackingId,
      };

      this.logger.log(
        `✅ Optimization completed successfully - TX: ${transactionResult.hash}`,
      );

      return response;
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

  //   @Post('test-yield-analysis')
  //   @HttpCode(HttpStatus.OK)
  //   @ApiOperation({
  //     summary: 'Test AI Yield Analysis Endpoint',
  //     description: 'Test the /yield-analysis endpoint with simple payload',
  //   })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'AI yield analysis test completed',
  //   })
  //   async testYieldAnalysis(): Promise<any> {
  //     this.logger.log('🧪 Testing AI yield analysis endpoint...');

  //     try {
  //       const aiResponse =
  //         await this.agentCommunicationService.requestYieldAnalysisSimple(
  //           'USDC',
  //           '5000',
  //           'moderate',
  //         );

  //       this.logger.log('✅ AI yield analysis test successful');

  //       return {
  //         success: true,
  //         message: 'AI yield analysis endpoint is working correctly',
  //         aiResponse,
  //         endpoint: 'http://localhost:3001/yield-analysis',
  //         payload: {
  //           inputToken: 'USDC',
  //           inputAmount: '5000',
  //           riskTolerance: 'moderate',
  //         },
  //         timestamp: new Date().toISOString(),
  //       };
  //     } catch (error) {
  //       this.logger.error(`❌ AI yield analysis test failed: ${error.message}`);

  //       return {
  //         success: false,
  //         message: 'AI yield analysis endpoint test failed (via service)',
  //         error: error.message,
  //         endpoint: 'http://localhost:3001/api/v1/yield-analysis',
  //         method: 'axios via AgentCommunicationService',
  //         payload: {
  //           inputToken: 'USDC',
  //           inputAmount: '5000',
  //           riskTolerance: 'moderate',
  //         },
  //         timestamp: new Date().toISOString(),
  //       };
  //     }
  //   }

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

  @Post('/api/v1/direct-deposit-optimization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Direct deposit optimization for supported tokens',
    description:
      'Optimizes direct deposits for LINK, WBTC, WETH, AAVE, GHO, EURS tokens only',
  })
  @ApiBody({ type: DirectDepositRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Direct deposit optimization completed successfully',
    type: DirectDepositResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input parameters or unsupported token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during optimization',
  })
  async directDepositOptimization(
    @Body(ValidationPipe) request: DirectDepositRequestDto,
  ): Promise<DirectDepositResponseDto> {
    const timestamp = new Date().toISOString();
    this.logger.log(
      `🏦 Starting direct deposit optimization for ${request.inputTokenSymbol} - Amount: ${request.inputTokenAmount}`,
    );

    try {
      // Step 1: Validate supported token
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

      // Step 2: Call AI agent for optimization analysis
      this.logger.log('🤖 Requesting optimization analysis from AI agent');

      // For MVP, we'll call a simplified analysis endpoint
      // In production, this would be the full AI optimization logic
      const optimizationResponse =
        await this.generateDirectDepositOptimization(request);

      // Step 3: Return structured response matching AI agent expectations
      const response: DirectDepositResponseDto = {
        success: true,
        data: {
          inputToken: {
            address: request.inputTokenAddress,
            symbol: request.inputTokenSymbol,
            amount: request.inputTokenAmount,
            usdValue: request.usdAmount,
          },
          optimization: optimizationResponse.optimization,
          marketAnalysis: optimizationResponse.marketAnalysis,
          timestamp: timestamp,
        },
        timestamp: timestamp,
      };

      this.logger.log(
        `✅ Direct deposit optimization completed for ${request.inputTokenSymbol}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `❌ Direct deposit optimization failed: ${error.message}`,
        error.stack,
      );

      // Return error response in expected format
      return {
        success: false,
        data: {
          inputToken: {
            address: request.inputTokenAddress,
            symbol: request.inputTokenSymbol,
            amount: request.inputTokenAmount,
            usdValue: request.usdAmount,
          },
          optimization: {
            strategy: 'error',
            recommendations: [],
            expectedAPY: 0,
            confidence: 0,
            reasoning: `Optimization failed: ${error.message}`,
          },
          marketAnalysis: {
            timestamp: timestamp,
            totalTvl: 0,
            averageYield: 0,
            topProtocols: [],
            marketCondition: 'unknown',
          },
          timestamp: timestamp,
        },
        timestamp: timestamp,
      };
    }
  }

  private async validateOptimizationRequest(
    request: OptimizeDepositDto,
  ): Promise<void> {
    // Validate user address format
    if (!request.userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid user address format');
    }

    // Validate token address format
    if (!request.inputTokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid token address format');
    }

    // Validate token symbol
    if (!request.inputTokenSymbol.match(/^[A-Z]+$/)) {
      throw new Error('Invalid token symbol format');
    }

    // Validate input amount
    const amount = parseFloat(request.inputAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid input amount');
    }

    // Validate risk tolerance
    if (!Object.values(RiskTolerance).includes(request.riskTolerance)) {
      throw new Error('Invalid risk tolerance level');
    }

    this.logger.log('✅ Input validation passed');
  }

  private getMaxDrawdownByRisk(riskTolerance: RiskTolerance): number {
    switch (riskTolerance) {
      case RiskTolerance.CONSERVATIVE:
        return 5.0; // 5% max drawdown
      case RiskTolerance.BALANCED:
        return 10.0; // 10% max drawdown
      case RiskTolerance.AGGRESSIVE:
        return 20.0; // 20% max drawdown
      default:
        return 10.0;
    }
  }

  private calculateWeightedAPY(allocations: any[]): number {
    return allocations.reduce((weightedAPY, allocation) => {
      return (
        weightedAPY + (allocation.expectedAPY * allocation.percentage) / 100
      );
    }, 0);
  }

  private isSupportedToken(symbol: string, address: string): boolean {
    const expectedAddress = SUPPORTED_TOKENS[symbol as SupportedTokenSymbol];
    return (
      expectedAddress !== undefined &&
      expectedAddress.toLowerCase() === address.toLowerCase()
    );
  }

  private async generateDirectDepositOptimization(
    request: DirectDepositRequestDto,
  ) {
    // For MVP - generate mock optimization data
    // In production, this would call the actual AI optimization service

    const mockOptimization = {
      optimization: {
        strategy: request.riskTolerance,
        recommendations: [
          {
            protocol: 'aave',
            percentage: 100,
            expectedAPY: 525.99,
            riskScore: 3,
            tvl: 8.189781998654432e29,
            chain: 'sepolia',
            token: request.inputTokenSymbol,
            amount: request.inputTokenAmount,
          },
        ],
        expectedAPY: 525.99,
        confidence: 85,
        reasoning: `${request.riskTolerance} strategy: Full allocation to Aave V3 on sepolia (525.99% APY) - single available option.`,
      },
      marketAnalysis: {
        timestamp: new Date().toISOString(),
        totalTvl: 107124793694.53532,
        averageYield: 525.99,
        topProtocols: ['aave-v3 (sepolia)'],
        marketCondition: 'bull',
      },
    };

    return mockOptimization;
  }
}
