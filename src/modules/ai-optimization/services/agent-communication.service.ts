import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import {
  YieldAnalysisRequest,
  YieldAnalysisResponse,
  MarketData,
  RiskProfile,
  RiskTolerance,
  AllocationStrategy,
  AIPortfolioOptimizationContentDto,
  AIOptimizationDataResponse,
  AIAllocationResponse,
  AIProtocolDetails,
} from '../dto/optimization.dto';

@Injectable()
export class AgentCommunicationService {
  private readonly logger = new Logger(AgentCommunicationService.name);
  private readonly aiAgentEndpoint: string;
  private readonly aiAgentApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.aiAgentEndpoint = this.configService.get<string>(
      'config.aiAgent.endpoint',
      'http://localhost:3001',
    );
    this.aiAgentApiKey = this.configService.get<string>(
      'config.aiAgent.apiKey',
      '',
    );
  }

  async requestYieldAnalysis(
    params: YieldAnalysisRequest,
  ): Promise<YieldAnalysisResponse> {
    this.logger.log(
      `Requesting yield analysis from AI agent for ${params.inputToken} amount: ${params.inputAmount}`,
    );

    try {
      // Prepare request payload for AI agent
      const requestPayload = {
        action: 'analyze_yield_opportunity',
        data: {
          inputToken: params.inputToken,
          inputAmount: params.inputAmount,
          marketData: params.currentMarketData,
          riskProfile: params.userRiskProfile,
          timestamp: new Date().toISOString(),
        },
      };

      // Make HTTP request to AI agent
      const response: AxiosResponse = await axios.post(
        `${this.aiAgentEndpoint}/api/yield-analysis`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.aiAgentApiKey && {
              Authorization: `Bearer ${this.aiAgentApiKey}`,
            }),
          },
          timeout: 30000, // 30 second timeout
        },
      );

      // Parse AI agent response
      const aiResponse = response.data;

      // Validate response structure
      this.validateAIResponse(aiResponse);

      // Transform AI response to our expected format
      const analysisResponse: YieldAnalysisResponse = {
        allocation:
          aiResponse.allocation || this.generateFallbackAllocation(params),
        confidence: aiResponse.confidence || 0.75,
        reasoning: aiResponse.reasoning || 'AI analysis completed successfully',
        marketAnalysis:
          aiResponse.marketAnalysis || this.generateFallbackMarketAnalysis(),
      };

      this.logger.log(
        `AI analysis completed with confidence: ${analysisResponse.confidence}`,
      );

      return analysisResponse;
    } catch (error) {
      this.logger.error(
        `Failed to get AI analysis: ${error.message}`,
        error.stack,
      );

      // Return fallback strategy
      return this.generateFallbackResponse(params);
    }
  }

  async pingAIAgent(): Promise<boolean> {
    try {
      this.logger.log('Pinging AI agent health check');

      const response: AxiosResponse = await axios.get(
        `${this.aiAgentEndpoint}/health`,
        {
          timeout: 5000,
        },
      );

      const isHealthy = response.status === 200;
      this.logger.log(`AI agent health check: ${isHealthy ? 'OK' : 'FAILED'}`);

      return isHealthy;
    } catch (error) {
      this.logger.warn(`AI agent health check failed: ${error.message}`);
      return false;
    }
  }

  async requestMarketInsights(tokens: string[]): Promise<any> {
    this.logger.log(
      `Requesting market insights for tokens: ${tokens.join(', ')}`,
    );

    try {
      const response: AxiosResponse = await axios.post(
        `${this.aiAgentEndpoint}/api/market-insights`,
        {
          action: 'get_market_insights',
          data: { tokens, timestamp: new Date().toISOString() },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.aiAgentApiKey && {
              Authorization: `Bearer ${this.aiAgentApiKey}`,
            }),
          },
          timeout: 15000,
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get market insights: ${error.message}`);
      return {
        insights: [],
        confidence: 0.5,
        reasoning: 'Market insights temporarily unavailable',
      };
    }
  }

  /**
   * New method for AI portfolio optimization matching expected format
   */
  async requestPortfolioOptimization(
    content: AIPortfolioOptimizationContentDto,
  ): Promise<AIOptimizationDataResponse> {
    this.logger.log(
      `🤖 Requesting AI portfolio optimization: ${content.text} - ${content.inputToken} ${content.inputAmount}`,
    );

    try {
      // Prepare request in the expected format
      const requestPayload = {
        content: {
          structured: content.structured,
          text: content.text,
          inputToken: content.inputToken,
          inputAmount: content.inputAmount,
          riskTolerance: content.riskTolerance,
        },
      };

      // Make HTTP request to AI agent
      const response: AxiosResponse = await axios.post(
        `${this.aiAgentEndpoint}/api/portfolio-optimization`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.aiAgentApiKey && {
              Authorization: `Bearer ${this.aiAgentApiKey}`,
            }),
          },
          timeout: 30000, // 30 second timeout
        },
      );

      // Parse AI agent response
      const aiResponse = response.data;

      // Validate response structure
      this.validateAIPortfolioResponse(aiResponse);

      this.logger.log(
        `✅ AI portfolio optimization completed with ${aiResponse.data?.confidence || 0}% confidence`,
      );

      return aiResponse.data;
    } catch (error) {
      this.logger.error(
        `❌ Failed to get AI portfolio optimization: ${error.message}`,
        error.stack,
      );

      // Return fallback strategy
      return this.generateFallbackPortfolioResponse(content);
    }
  }

  private validateAIResponse(response: any): void {
    if (!response) {
      throw new Error('Empty response from AI agent');
    }

    if (!response.allocation || !Array.isArray(response.allocation)) {
      throw new Error('Invalid allocation format in AI response');
    }

    // Validate allocation percentages sum to 100%
    const totalPercentage = response.allocation.reduce(
      (sum: number, alloc: any) => sum + (alloc.percentage || 0),
      0,
    );

    if (Math.abs(totalPercentage - 100) > 1) {
      throw new Error(`Invalid allocation percentages: ${totalPercentage}%`);
    }
  }

  private generateFallbackAllocation(
    params: YieldAnalysisRequest,
  ): AllocationStrategy[] {
    this.logger.warn('Generating fallback allocation strategy');

    // Conservative fallback based on risk tolerance
    const riskLevel = params.userRiskProfile.tolerance;

    switch (riskLevel) {
      case RiskTolerance.CONSERVATIVE:
        return [
          { protocol: 'aave', percentage: 70, expectedAPY: 3.5, riskScore: 2 },
          {
            protocol: 'compound',
            percentage: 30,
            expectedAPY: 3.2,
            riskScore: 2,
          },
        ];

      case RiskTolerance.BALANCED:
        return [
          { protocol: 'aave', percentage: 50, expectedAPY: 4.5, riskScore: 3 },
          {
            protocol: 'compound',
            percentage: 30,
            expectedAPY: 4.2,
            riskScore: 3,
          },
          { protocol: 'yearn', percentage: 20, expectedAPY: 6.8, riskScore: 5 },
        ];

      case RiskTolerance.AGGRESSIVE:
        return [
          { protocol: 'aave', percentage: 30, expectedAPY: 5.5, riskScore: 4 },
          { protocol: 'yearn', percentage: 70, expectedAPY: 8.2, riskScore: 6 },
        ];

      default:
        return [
          { protocol: 'aave', percentage: 100, expectedAPY: 4.0, riskScore: 3 },
        ];
    }
  }

  private generateFallbackMarketAnalysis(): any {
    return {
      trend: 'sideways',
      volatilityLevel: 'medium',
      liquidityCondition: 'good',
      recommendation:
        'Conservative approach recommended due to AI service unavailability',
    };
  }

  private generateFallbackResponse(
    params: YieldAnalysisRequest,
  ): YieldAnalysisResponse {
    this.logger.warn('Generating fallback yield analysis response');

    return {
      allocation: this.generateFallbackAllocation(params),
      confidence: 0.5,
      reasoning:
        'Using conservative fallback strategy due to AI unavailability',
      marketAnalysis: this.generateFallbackMarketAnalysis(),
    };
  }

  /**
   * Validate AI portfolio optimization response
   */
  private validateAIPortfolioResponse(response: any): void {
    if (!response) {
      throw new Error('Empty response from AI agent');
    }

    if (!response.success) {
      throw new Error('AI agent returned unsuccessful response');
    }

    if (!response.data) {
      throw new Error('Missing data in AI response');
    }

    const { data } = response;

    // Validate allocation object
    if (!data.allocation || typeof data.allocation !== 'object') {
      throw new Error('Invalid allocation format in AI response');
    }

    const { allocation } = data;
    if (
      typeof allocation.stablecoins !== 'number' ||
      typeof allocation.bluechip !== 'number' ||
      typeof allocation.riskAssets !== 'number'
    ) {
      throw new Error('Invalid allocation percentages in AI response');
    }

    // Validate total allocation equals 100%
    const totalAllocation =
      allocation.stablecoins + allocation.bluechip + allocation.riskAssets;
    if (Math.abs(totalAllocation - 100) > 1) {
      throw new Error(`Invalid total allocation: ${totalAllocation}%`);
    }

    // Validate protocols array
    if (!data.protocols || !Array.isArray(data.protocols)) {
      throw new Error('Invalid protocols format in AI response');
    }

    // Validate protocol percentages sum to 100%
    const totalProtocolPercentage = data.protocols.reduce(
      (sum: number, protocol: any) => sum + (protocol.percentage || 0),
      0,
    );

    if (Math.abs(totalProtocolPercentage - 100) > 1) {
      throw new Error(
        `Invalid protocol percentages: ${totalProtocolPercentage}%`,
      );
    }

    // Validate confidence
    if (
      typeof data.confidence !== 'number' ||
      data.confidence < 0 ||
      data.confidence > 100
    ) {
      throw new Error('Invalid confidence value in AI response');
    }
  }

  /**
   * Generate fallback portfolio optimization response
   */
  private generateFallbackPortfolioResponse(
    content: AIPortfolioOptimizationContentDto,
  ): AIOptimizationDataResponse {
    this.logger.warn('Generating fallback portfolio optimization response');

    // Create conservative allocation based on risk tolerance
    let allocation: AIAllocationResponse;
    let protocols: AIProtocolDetails[];

    switch (content.riskTolerance) {
      case RiskTolerance.CONSERVATIVE:
        allocation = { stablecoins: 80, bluechip: 15, riskAssets: 5 };
        protocols = [
          {
            protocol: 'Aave',
            percentage: 50,
            expectedAPY: 3.5,
            riskScore: 2,
            category: 'stablecoins',
          },
          {
            protocol: 'Compound',
            percentage: 30,
            expectedAPY: 3.2,
            riskScore: 2,
            category: 'stablecoins',
          },
          {
            protocol: 'Yearn',
            percentage: 20,
            expectedAPY: 5.1,
            riskScore: 3,
            category: 'bluechip',
          },
        ];
        break;

      case RiskTolerance.MODERATE:
        allocation = { stablecoins: 50, bluechip: 30, riskAssets: 20 };
        protocols = [
          {
            protocol: 'Aave',
            percentage: 25,
            expectedAPY: 4.5,
            riskScore: 2,
            category: 'stablecoins',
          },
          {
            protocol: 'Compound',
            percentage: 25,
            expectedAPY: 4.2,
            riskScore: 2,
            category: 'stablecoins',
          },
          {
            protocol: 'Yearn',
            percentage: 30,
            expectedAPY: 6.8,
            riskScore: 3,
            category: 'bluechip',
          },
          {
            protocol: 'Custom',
            percentage: 20,
            expectedAPY: 12.5,
            riskScore: 4,
            category: 'riskAssets',
          },
        ];
        break;

      case RiskTolerance.BALANCED:
        allocation = { stablecoins: 40, bluechip: 40, riskAssets: 20 };
        protocols = [
          {
            protocol: 'Aave',
            percentage: 20,
            expectedAPY: 4.8,
            riskScore: 2,
            category: 'stablecoins',
          },
          {
            protocol: 'Compound',
            percentage: 20,
            expectedAPY: 4.5,
            riskScore: 2,
            category: 'stablecoins',
          },
          {
            protocol: 'Yearn',
            percentage: 40,
            expectedAPY: 7.5,
            riskScore: 3,
            category: 'bluechip',
          },
          {
            protocol: 'Custom',
            percentage: 20,
            expectedAPY: 15.2,
            riskScore: 4,
            category: 'riskAssets',
          },
        ];
        break;

      case RiskTolerance.AGGRESSIVE:
        allocation = { stablecoins: 20, bluechip: 30, riskAssets: 50 };
        protocols = [
          {
            protocol: 'Aave',
            percentage: 20,
            expectedAPY: 5.2,
            riskScore: 2,
            category: 'stablecoins',
          },
          {
            protocol: 'Yearn',
            percentage: 30,
            expectedAPY: 8.9,
            riskScore: 3,
            category: 'bluechip',
          },
          {
            protocol: 'Custom',
            percentage: 50,
            expectedAPY: 18.7,
            riskScore: 5,
            category: 'riskAssets',
          },
        ];
        break;

      default:
        allocation = { stablecoins: 50, bluechip: 30, riskAssets: 20 };
        protocols = [
          {
            protocol: 'Aave',
            percentage: 50,
            expectedAPY: 4.0,
            riskScore: 2,
            category: 'stablecoins',
          },
          {
            protocol: 'Yearn',
            percentage: 50,
            expectedAPY: 6.5,
            riskScore: 3,
            category: 'bluechip',
          },
        ];
    }

    // Calculate weighted average APY
    const expectedAPY = protocols.reduce(
      (sum, protocol) =>
        sum + (protocol.expectedAPY * protocol.percentage) / 100,
      0,
    );

    return {
      allocation,
      expectedAPY: Math.round(expectedAPY * 10) / 10, // Round to 1 decimal
      protocols,
      confidence: 65, // Moderate confidence for fallback
      reasoning: `Conservative ${content.riskTolerance} allocation based on current market conditions. Using fallback strategy due to AI service unavailability.`,
    };
  }

  /**
   * New method for yield analysis using the correct endpoint and simple payload
   */
  async requestYieldAnalysisSimple(
    inputToken: string,
    inputAmount: string,
    riskTolerance: string,
  ): Promise<any> {
    this.logger.log(
      `🤖 Requesting yield analysis: ${inputToken} ${inputAmount} (${riskTolerance})`,
    );

    try {
      // Make the simple request to /yield-analysis endpoint using axios
      const response: AxiosResponse = await axios.post(
        `${this.aiAgentEndpoint}/api/v1/yield-analysis`,
        {
          inputToken,
          inputAmount,
          riskTolerance,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.aiAgentApiKey && {
              Authorization: `Bearer ${this.aiAgentApiKey}`,
            }),
          },
          timeout: 30000, // 30 second timeout
        },
      );

      const aiResponse = response.data;

      this.logger.log('AI response:', JSON.stringify(aiResponse, null, 2));

      this.logger.log(`✅ AI yield analysis completed successfully`);

      return aiResponse;
    } catch (error) {
      this.logger.error(
        `❌ Failed to get AI yield analysis: ${error.message}`,
        error.stack,
      );
    }
  }
}
