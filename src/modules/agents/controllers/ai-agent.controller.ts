import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import {
  AliothAIAgentService,
  AIDecision,
  MarketInsight,
} from '../services/alioth-ai-agent.service';
import {
  ChatMessageDto,
  InvestmentDecisionDto,
  ExecuteDecisionDto,
  AIMode,
} from '../dto/ai-agent.dto';

export class MarketInsightsResponse {
  insights: MarketInsight[];
  timestamp: Date;
  mode: string;
}

export class ChatResponse {
  response: string;
  sessionId: string;
  mode: string;
  timestamp: Date;
}

export class DecisionResponse {
  decision: AIDecision;
  timestamp: Date;
  mode: string;
}

@ApiTags('ai-agent')
@Controller('ai-agent')
export class AIAgentController {
  private readonly logger = new Logger(AIAgentController.name);

  constructor(private readonly aiAgentService: AliothAIAgentService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Chat with AI agent',
    description:
      'Interactive chat interface with the AI agent for DeFi advice and analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'AI response generated successfully',
    type: ChatResponse,
  })
  async chat(@Body() chatDto: ChatMessageDto): Promise<ChatResponse> {
    try {
      this.logger.log(
        `💬 Processing chat message from session ${chatDto.sessionId}`,
      );

      const response = await this.aiAgentService.processChatMessage(
        chatDto.sessionId,
        chatDto.message,
        chatDto.userAddress,
        chatDto.mode || 'balanced',
      );

      return {
        response,
        sessionId: chatDto.sessionId,
        mode: chatDto.mode || 'balanced',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Chat processing failed: ${error.message}`);
      throw new HttpException(
        `Failed to process chat message: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('decide')
  @ApiOperation({
    summary: 'Get AI investment decision',
    description:
      'Generate AI-powered investment decisions based on current market conditions and user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Investment decision generated successfully',
    type: DecisionResponse,
  })
  async makeInvestmentDecision(
    @Body() decisionDto: InvestmentDecisionDto,
  ): Promise<DecisionResponse> {
    try {
      this.logger.log(
        `🧠 Generating investment decision for ${decisionDto.userAddress} in ${decisionDto.mode || 'balanced'} mode${decisionDto.aliothWalletId ? ` using Alioth wallet ${decisionDto.aliothWalletId}` : ''}`,
      );

      const decision = await this.aiAgentService.makeInvestmentDecision(
        decisionDto.userAddress,
        decisionDto.mode || 'balanced',
        decisionDto.context,
        decisionDto.aliothWalletId,
      );

      return {
        decision,
        timestamp: new Date(),
        mode: decisionDto.mode || 'balanced',
      };
    } catch (error) {
      this.logger.error(`❌ Decision generation failed: ${error.message}`);
      throw new HttpException(
        `Failed to generate investment decision: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('execute-decision')
  @ApiOperation({
    summary: 'Execute AI decision',
    description:
      'Execute the AI-generated investment decision with user confirmation',
  })
  @ApiResponse({
    status: 200,
    description: 'Decision executed successfully',
  })
  async executeDecision(@Body() executeDto: ExecuteDecisionDto) {
    try {
      this.logger.log(`🚀 Executing decision for ${executeDto.userAddress}`);

      if (!executeDto.userConfirmation) {
        throw new HttpException(
          'User confirmation is required to execute decisions',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.aiAgentService.executeDecision(
        executeDto.userAddress,
        executeDto.decision,
        executeDto.userConfirmation,
      );

      return {
        ...result,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Decision execution failed: ${error.message}`);
      throw new HttpException(
        `Failed to execute decision: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('insights')
  @ApiOperation({
    summary: 'Get market insights',
    description:
      'Retrieve real-time market insights and opportunities from the AI agent',
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['conservative', 'balanced', 'aggressive', 'yolo'],
  })
  @ApiResponse({
    status: 200,
    description: 'Market insights retrieved successfully',
    type: MarketInsightsResponse,
  })
  async getMarketInsights(
    @Query('mode')
    mode: 'conservative' | 'balanced' | 'aggressive' | 'yolo' = 'balanced',
  ): Promise<MarketInsightsResponse> {
    try {
      this.logger.log(`📊 Retrieving market insights in ${mode} mode`);

      const insights = await this.aiAgentService.getMarketInsights(mode);

      return {
        insights,
        timestamp: new Date(),
        mode,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get market insights: ${error.message}`);
      throw new HttpException(
        `Failed to retrieve market insights: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('modes')
  @ApiOperation({
    summary: 'Get available AI modes',
    description:
      'Retrieve information about available AI agent modes and their characteristics',
  })
  @ApiResponse({
    status: 200,
    description: 'AI modes retrieved successfully',
  })
  async getAvailableModes() {
    return {
      modes: {
        conservative: {
          name: 'Conservative',
          description: 'Focus on blue-chip protocols with proven track records',
          riskLevel: 'Low',
          expectedAPY: '3-8%',
          features: [
            'Capital preservation',
            'AAA-rated protocols',
            'Minimal risk',
          ],
        },
        balanced: {
          name: 'Balanced',
          description:
            'Optimal risk-reward balance with strategic diversification',
          riskLevel: 'Medium',
          expectedAPY: '5-15%',
          features: [
            'Risk-reward optimization',
            'Diversified protocols',
            'Moderate risk',
          ],
        },
        aggressive: {
          name: 'Aggressive',
          description:
            'Higher yields with calculated risks and active monitoring',
          riskLevel: 'High',
          expectedAPY: '8-25%',
          features: [
            'Higher yield pursuit',
            'Active monitoring',
            'Calculated risks',
          ],
        },
        yolo: {
          name: 'YOLO',
          description:
            'Maximum yield pursuit with full risk awareness and monitoring',
          riskLevel: 'Very High',
          expectedAPY: '15-100%+',
          features: [
            'Maximum yields',
            '24/7 monitoring',
            'Full risk awareness',
          ],
        },
      },
      default: 'balanced',
    };
  }

  @Post('mode-demo/:mode')
  @ApiOperation({
    summary: 'Demo AI mode',
    description: 'Get a demonstration of how the AI behaves in different modes',
  })
  @ApiResponse({
    status: 200,
    description: 'Mode demonstration generated successfully',
  })
  async demonstrateMode(
    @Param('mode') mode: 'conservative' | 'balanced' | 'aggressive' | 'yolo',
  ) {
    try {
      this.logger.log(`🎭 Demonstrating ${mode} mode`);

      // Generate a sample session ID for demo
      const demoSessionId = `demo-${Date.now()}`;

      // Get demo responses for different queries
      const demoQueries = [
        'What are the best yields right now?',
        'Analyze my portfolio',
        'What should I do?',
      ];

      const demoResponses = [];

      for (const query of demoQueries) {
        const response = await this.aiAgentService.processChatMessage(
          demoSessionId,
          query,
          undefined, // No user address for demo
          mode,
        );

        demoResponses.push({
          query,
          response,
        });
      }

      return {
        mode,
        demoResponses,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Mode demonstration failed: ${error.message}`);
      throw new HttpException(
        `Failed to demonstrate mode: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'AI agent health check',
    description: 'Check if the AI agent is running and healthy',
  })
  @ApiResponse({
    status: 200,
    description: 'AI agent health status',
  })
  async healthCheck() {
    try {
      // Simple health check by getting market insights
      const insights = await this.aiAgentService.getMarketInsights('balanced');

      return {
        status: 'healthy',
        message: 'AI agent is operational',
        timestamp: new Date(),
        features: {
          chatInterface: true,
          decisionMaking: true,
          marketInsights: true,
          multipleModes: true,
        },
        insightsCount: insights.length,
      };
    } catch (error) {
      this.logger.error(`❌ Health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        message: `AI agent error: ${error.message}`,
        timestamp: new Date(),
        features: {
          chatInterface: false,
          decisionMaking: false,
          marketInsights: false,
          multipleModes: false,
        },
      };
    }
  }

  @Post('quick-decision')
  @ApiOperation({
    summary: 'Quick AI decision for YOLO mode',
    description:
      'Get a rapid decision optimized for YOLO mode users who want immediate action',
  })
  @ApiResponse({
    status: 200,
    description: 'Quick decision generated successfully',
  })
  async quickYoloDecision(@Body() decisionDto: InvestmentDecisionDto) {
    try {
      this.logger.log(
        `🔥 Generating quick YOLO decision for ${decisionDto.userAddress}`,
      );

      // Force YOLO mode for quick decisions
      const decision = await this.aiAgentService.makeInvestmentDecision(
        decisionDto.userAddress,
        'yolo',
        { ...decisionDto.context, quickDecision: true },
      );

      return {
        decision,
        timestamp: new Date(),
        mode: 'yolo',
        message:
          '🔥 YOLO decision ready! This is a high-risk, high-reward strategy. Proceed with caution!',
        warnings: [
          'This is a YOLO mode decision with elevated risks',
          'Only invest what you can afford to lose',
          'Monitor positions closely',
          'Consider taking profits at predetermined levels',
        ],
      };
    } catch (error) {
      this.logger.error(`❌ Quick YOLO decision failed: ${error.message}`);
      throw new HttpException(
        `Failed to generate quick decision: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
