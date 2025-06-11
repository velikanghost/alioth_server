import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aliothCharacter, agentModes } from '../../../config/eliza.config';
import { ChainlinkDataService } from '../../market-analysis/services/chainlink-data.service';
import { AIYieldOptimizationService } from '../../ai-optimization/services/ai-yield-optimization.service';
import { PerformanceTrackingService } from '../../performance-tracking/services/performance-tracking.service';
import { VaultService } from '../../yield-vault/services/vault.service';
import { APRTrackingService } from '../../yield-vault/services/apr-tracking.service';

export interface AIDecision {
  decision: string;
  confidence: number;
  reasoning: string[];
  risks: string[];
  expectedOutcome: {
    apyImprovement?: number;
    riskScore?: number;
    gasEstimate?: number;
  };
  executionPlan: {
    actions: AIAction[];
    timeline: string;
    prerequisites: string[];
  };
}

export interface AIAction {
  type: 'swap' | 'deposit' | 'withdraw' | 'rebalance';
  protocol: string;
  token: string;
  amount: string;
  priority: number;
}

export interface MarketInsight {
  category: 'opportunity' | 'risk' | 'neutral';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionRequired: boolean;
  data: any;
}

export type AIMode = 'conservative' | 'balanced' | 'aggressive' | 'yolo';

export interface ChatContext {
  userAddress?: string;
  sessionId: string;
  mode: AIMode;
  conversationHistory: ChatMessage[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

@Injectable()
export class AliothAIAgentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AliothAIAgentService.name);
  private isInitialized = false;
  private defiKnowledgeBase: Map<string, any> = new Map();
  private activeChatSessions: Map<string, ChatContext> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly chainlinkDataService: ChainlinkDataService,
    private readonly aiOptimizationService: AIYieldOptimizationService,
    private readonly performanceTrackingService: PerformanceTrackingService,
    private readonly vaultService: VaultService,
    private readonly aprTrackingService: APRTrackingService,
  ) {}

  async onModuleInit() {
    try {
      await this.initializeAgent();
      await this.loadDeFiKnowledgeBase();
      this.logger.log('🤖 Alioth AI Agent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Alioth AI Agent:', error);
    }
  }

  async onModuleDestroy() {
    if (this.isInitialized) {
      this.logger.log('Shutting down Alioth AI Agent...');
      this.isInitialized = false;
    }
  }

  /**
   * Main decision-making function for AI agent
   */
  async makeInvestmentDecision(
    userAddress: string,
    mode: AIMode = 'balanced',
    context?: any,
    aliothWalletId?: string,
  ): Promise<AIDecision> {
    if (!this.isInitialized) {
      throw new Error('AI Agent not initialized');
    }

    try {
      this.logger.log(
        `🧠 Making investment decision for ${userAddress} in ${mode} mode${aliothWalletId ? ` using Alioth wallet ${aliothWalletId}` : ''}`,
      );

      // 1. Gather market data
      const marketData = await this.gatherMarketData();

      // 2. Analyze user portfolio
      const portfolioAnalysis = await this.analyzeUserPortfolio(
        userAddress,
        aliothWalletId,
      );

      // 3. Get current APY opportunities
      const yieldOpportunities = await this.identifyYieldOpportunities(mode);

      // 4. Assess risks
      const riskAssessment = await this.assessMarketRisks(mode);

      // 5. Generate decision using AI logic
      const decision = await this.generateOptimalDecision({
        userAddress,
        mode,
        marketData,
        portfolioAnalysis,
        yieldOpportunities,
        riskAssessment,
        context,
        aliothWalletId,
      });

      this.logger.log(
        `✅ Decision generated with ${decision.confidence}% confidence`,
      );
      return decision;
    } catch (error) {
      this.logger.error(
        `❌ Failed to make investment decision: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Chat interface for user interaction
   */
  async processChatMessage(
    sessionId: string,
    userMessage: string,
    userAddress?: string,
    mode: AIMode = 'balanced',
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('AI Agent not initialized');
    }

    try {
      // Get or create chat context
      let context = this.activeChatSessions.get(sessionId);
      if (!context) {
        context = {
          userAddress,
          sessionId,
          mode,
          conversationHistory: [],
        };
        this.activeChatSessions.set(sessionId, context);
      }

      // Add user message to history
      context.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      // Generate AI response
      const response = await this.generateChatResponse(userMessage, context);

      // Add AI response to history
      context.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      });

      // Limit conversation history to last 20 messages
      if (context.conversationHistory.length > 20) {
        context.conversationHistory = context.conversationHistory.slice(-20);
      }

      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to process chat message: ${error.message}`);
      return `I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.`;
    }
  }

  /**
   * Get real-time market insights
   */
  async getMarketInsights(mode: AIMode = 'balanced'): Promise<MarketInsight[]> {
    try {
      const insights: MarketInsight[] = [];
      const modeConfig = agentModes[mode];

      // 1. APY opportunities
      const yieldOpportunities = await this.identifyYieldOpportunities(mode);
      if (yieldOpportunities.length > 0) {
        insights.push({
          category: 'opportunity',
          title: 'High Yield Opportunities Detected',
          description: `Found ${yieldOpportunities.length} protocols offering APY above ${modeConfig.maxAPYThreshold}%`,
          impact: 'high',
          confidence: 85,
          actionRequired: true,
          data: yieldOpportunities.slice(0, 3),
        });
      }

      // 2. Risk assessment
      const riskInsights = await this.assessMarketRisks(mode);
      if (riskInsights.highRiskProtocols.length > 0) {
        insights.push({
          category: 'risk',
          title: 'Protocol Risk Alert',
          description: `${riskInsights.highRiskProtocols.length} protocols showing elevated risk levels`,
          impact: 'medium',
          confidence: 90,
          actionRequired: true,
          data: riskInsights.highRiskProtocols,
        });
      }

      // 3. Gas optimization
      const gasAnalysis = await this.analyzeGasConditions();
      if (gasAnalysis.isOptimal) {
        insights.push({
          category: 'opportunity',
          title: 'Optimal Gas Conditions',
          description: `Network congestion low, estimated gas savings: ${gasAnalysis.savingsPercent}%`,
          impact: 'medium',
          confidence: 95,
          actionRequired: true,
          data: gasAnalysis,
        });
      }

      return insights;
    } catch (error) {
      this.logger.error(`❌ Failed to get market insights: ${error.message}`);
      return [];
    }
  }

  /**
   * Execute AI decision (with user confirmation)
   */
  async executeDecision(
    userAddress: string,
    decision: AIDecision,
    userConfirmation: boolean = false,
  ): Promise<{ success: boolean; results: any; errors?: string[] }> {
    if (!userConfirmation) {
      throw new Error('User confirmation required for decision execution');
    }

    try {
      this.logger.log(`🚀 Executing AI decision for ${userAddress}`);

      const results = [];
      const errors = [];

      for (const action of decision.executionPlan.actions) {
        try {
          const result = await this.executeAction(userAddress, action);
          results.push(result);
          this.logger.log(
            `✅ Action executed: ${action.type} ${action.token} on ${action.protocol}`,
          );
        } catch (error) {
          const errorMsg = `Failed to execute ${action.type}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(`❌ ${errorMsg}`);
        }
      }

      // Track decision performance
      await this.trackDecisionPerformance(userAddress, decision, results);

      return {
        success: errors.length === 0,
        results,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to execute decision: ${error.message}`);
      return {
        success: false,
        results: [],
        errors: [error.message],
      };
    }
  }

  /**
   * Private helper methods
   */
  private async initializeAgent() {
    this.logger.log(`Initializing AI Agent: ${aliothCharacter.name}`);
    this.logger.log(`Bio: ${aliothCharacter.bio.join(' ')}`);
    this.isInitialized = true;
  }

  private async loadDeFiKnowledgeBase() {
    // Load protocol data
    const protocols = {
      aave: {
        type: 'lending',
        chains: ['ethereum', 'polygon', 'avalanche', 'arbitrum'],
        riskScore: 9,
        auditStatus: 'AAA',
        features: ['variable rates', 'stable rates', 'flash loans'],
        minAPY: 0.1,
        maxAPY: 12.0,
      },
      compound: {
        type: 'lending',
        chains: ['ethereum', 'polygon'],
        riskScore: 9,
        auditStatus: 'AAA',
        features: ['algorithmic rates', 'governance'],
        minAPY: 0.1,
        maxAPY: 8.0,
      },
      curve: {
        type: 'dex_amm',
        chains: ['ethereum', 'polygon', 'arbitrum'],
        riskScore: 8,
        auditStatus: 'AA',
        features: ['stablecoin pools', 'low slippage', 'rewards'],
        minAPY: 1.0,
        maxAPY: 25.0,
      },
      yearn: {
        type: 'yield_aggregator',
        chains: ['ethereum', 'arbitrum'],
        riskScore: 7,
        auditStatus: 'AA',
        features: ['auto-compounding', 'strategies'],
        minAPY: 2.0,
        maxAPY: 50.0,
      },
    };

    for (const [name, data] of Object.entries(protocols)) {
      this.defiKnowledgeBase.set(`protocol:${name}`, data);
    }

    // Load token data
    const tokens = {
      USDC: {
        type: 'stablecoin',
        volatility: 'very_low',
        liquidity: 'very_high',
      },
      USDT: {
        type: 'stablecoin',
        volatility: 'very_low',
        liquidity: 'very_high',
      },
      WETH: { type: 'volatile', volatility: 'high', liquidity: 'very_high' },
      WBTC: { type: 'volatile', volatility: 'high', liquidity: 'high' },
      AAVE: {
        type: 'governance',
        volatility: 'very_high',
        liquidity: 'medium',
      },
    };

    for (const [symbol, data] of Object.entries(tokens)) {
      this.defiKnowledgeBase.set(`token:${symbol}`, data);
    }

    this.logger.log(
      `📚 Loaded knowledge base with ${this.defiKnowledgeBase.size} entries`,
    );
  }

  private async gatherMarketData() {
    try {
      // Get supported tokens for analysis
      const supportedTokens = ['AAVE', 'WETH', 'WBTC', 'USDC', 'USDT'];

      // Get price data from Chainlink
      const priceData =
        await this.chainlinkDataService.getMultipleTokenPrices(supportedTokens);

      // Get APR data
      const aprData = await this.aprTrackingService.getAPRHistory(
        undefined,
        undefined,
        undefined,
        10,
      );

      return {
        prices: priceData,
        aprs: aprData,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to gather complete market data: ${error.message}`,
      );
      return { prices: {}, aprs: [], timestamp: new Date() };
    }
  }

  private async analyzeUserPortfolio(
    userAddress: string,
    aliothWalletId?: string,
  ) {
    try {
      // Get user vault data
      const userVault = await this.vaultService.getUserVault(userAddress);

      // Get portfolio from contract using Alioth wallet
      const contractPortfolio =
        await this.vaultService.getUserPortfolioFromContract(
          userAddress,
          11155111, // Default to Sepolia
          aliothWalletId,
        );

      this.logger.log(
        `📊 Portfolio analysis: ${contractPortfolio.tokens.length} positions found${aliothWalletId ? ` using Alioth wallet ${aliothWalletId}` : ' using default/first Alioth wallet'}`,
      );

      return {
        totalValue: userVault.totalValueLocked || 0,
        positions: userVault.vaultBalances || [],
        contractData: contractPortfolio,
        riskProfile: userVault.riskProfile || 'moderate',
        aliothWalletId,
      };
    } catch (error) {
      this.logger.warn(`Failed to analyze user portfolio: ${error.message}`);
      return {
        totalValue: 0,
        positions: [],
        contractData: null,
        riskProfile: 'moderate',
        aliothWalletId,
      };
    }
  }

  private async identifyYieldOpportunities(mode: AIMode) {
    try {
      const modeConfig = agentModes[mode];
      const aprData = await this.aprTrackingService.getAPRHistory(
        undefined,
        undefined,
        undefined,
        20,
      );

      return aprData
        .filter(
          (apr) =>
            apr.totalAPY <= modeConfig.maxAPYThreshold &&
            (apr.riskMetrics?.protocolRiskScore || 8) >=
              modeConfig.minProtocolScore,
        )
        .sort((a, b) => b.totalAPY - a.totalAPY)
        .slice(0, 10);
    } catch (error) {
      this.logger.warn(
        `Failed to identify yield opportunities: ${error.message}`,
      );
      return [];
    }
  }

  private async assessMarketRisks(mode: AIMode) {
    const modeConfig = agentModes[mode];

    // Mock risk assessment - in production, this would analyze real data
    return {
      overallRiskLevel:
        modeConfig.riskTolerance <= 3
          ? 'low'
          : modeConfig.riskTolerance <= 7
            ? 'medium'
            : 'high',
      highRiskProtocols: [],
      marketVolatility: 'medium',
      liquidityRisks: [],
    };
  }

  private async analyzeGasConditions() {
    // Mock gas analysis - in production, this would check real gas prices
    return {
      isOptimal: Math.random() > 0.7, // 30% chance of optimal conditions
      currentGwei: 25 + Math.random() * 50,
      savingsPercent: 30 + Math.random() * 40,
      recommendation: 'Execute transactions now for optimal gas savings',
    };
  }

  private async generateOptimalDecision(params: any): Promise<AIDecision> {
    const { mode, marketData, portfolioAnalysis, yieldOpportunities } = params;
    const modeConfig = agentModes[mode as AIMode];

    // Generate decision based on mode and data
    const topOpportunity = yieldOpportunities[0];
    const confidence = Math.min(95, 60 + (topOpportunity?.totalAPY || 0) * 5);

    return {
      decision:
        mode === 'yolo'
          ? `🔥 YOLO Strategy: Aggressive rebalancing to maximize yields`
          : `📊 ${mode} Strategy: Balanced rebalancing for optimal risk-adjusted returns`,
      confidence,
      reasoning: [
        `Current market conditions favor ${mode} approach`,
        `Identified ${yieldOpportunities.length} opportunities matching risk tolerance`,
        `Portfolio optimization potential: +${(Math.random() * 3 + 0.5).toFixed(1)}% APY`,
      ],
      risks:
        mode === 'yolo'
          ? [
              'High volatility exposure',
              'Smart contract risks',
              'Impermanent loss potential',
            ]
          : [
              'Standard protocol risks',
              'Market volatility',
              'Gas cost considerations',
            ],
      expectedOutcome: {
        apyImprovement: Math.random() * 3 + 0.5,
        riskScore: 10 - modeConfig.riskTolerance,
        gasEstimate: Math.random() * 50 + 10,
      },
      executionPlan: {
        actions: this.generateExecutionActions(yieldOpportunities.slice(0, 3)),
        timeline: '5-10 minutes',
        prerequisites: [
          'User confirmation',
          'Sufficient gas fees',
          'Market conditions stable',
        ],
      },
    };
  }

  private generateExecutionActions(opportunities: any[]): AIAction[] {
    return opportunities.map((opp, index) => ({
      type: 'deposit' as const,
      protocol: opp.protocolName || 'Aave',
      token: 'USDC',
      amount: (1000 + Math.random() * 5000).toFixed(2),
      priority: index + 1,
    }));
  }

  private async generateChatResponse(
    userMessage: string,
    context: ChatContext,
  ): Promise<string> {
    const message = userMessage.toLowerCase();
    const mode = context.mode;

    // Mode switching
    if (message.includes('yolo mode') || message.includes('enable yolo')) {
      context.mode = 'yolo';
      return `🔥 **YOLO MODE ACTIVATED** 🔥\n\n⚡ Ready for maximum yield hunting! I'll now focus on the highest APY opportunities regardless of risk. Current top picks:\n\n- Layer 2 farming: 25-40% APY\n- Alt-L1 protocols: 30-60% APY\n- New protocol launches: 50-100% APY\n\n⚠️ Remember: Higher rewards come with higher risks. I'll monitor everything 24/7!\n\nWhat's your preferred allocation percentage for YOLO plays?`;
    }

    if (message.includes('conservative mode')) {
      context.mode = 'conservative';
      return `🛡️ **Conservative Mode Enabled**\n\nFocusing on blue-chip protocols with proven safety records:\n- Aave V3: 4-8% APY\n- Compound V3: 3-7% APY\n- Lido staking: 3-5% APY\n\nAll recommendations will prioritize capital preservation over maximum yields.`;
    }

    // Yield analysis
    if (
      message.includes('yield') ||
      message.includes('apy') ||
      message.includes('best rates')
    ) {
      const opportunities = await this.identifyYieldOpportunities(mode);
      const modeEmoji =
        mode === 'yolo' ? '🔥' : mode === 'conservative' ? '🛡️' : '📊';

      return `${modeEmoji} **Current Top Yields (${mode.toUpperCase()} mode)**\n\n${opportunities
        .slice(0, 5)
        .map(
          (opp, i) =>
            `${i + 1}. **${opp.protocolName || 'Protocol'}**: ${opp.totalAPY?.toFixed(1) || '8.5'}% APY`,
        )
        .join(
          '\n',
        )}\n\n💡 Based on your ${mode} risk profile, I recommend ${opportunities.length > 0 ? `focusing on ${opportunities[0].protocolName}` : 'current allocations'}.\n\nWant me to create a detailed rebalancing plan?`;
    }

    // Portfolio analysis
    if (
      message.includes('portfolio') ||
      message.includes('balance') ||
      message.includes('my positions')
    ) {
      if (!context.userAddress) {
        return `📊 To analyze your portfolio, I need your wallet address. Please connect your wallet or provide your address.\n\nOnce connected, I can show you:\n- Current positions and yields\n- Optimization opportunities\n- Risk assessment\n- Rebalancing recommendations`;
      }

      return `📊 **Portfolio Analysis**\n\nAnalyzing your positions at ${context.userAddress}...\n\n🔍 I can see positions across multiple protocols. Your current average APY appears to be in the 6-8% range.\n\n💡 **Quick Insights:**\n- Diversification score: Good\n- Risk level: Matches your ${mode} profile\n- Optimization potential: +1.2% APY available\n\nWould you like detailed recommendations or shall I execute the optimization?`;
    }

    // Risk assessment
    if (
      message.includes('risk') ||
      message.includes('safe') ||
      message.includes('dangerous')
    ) {
      const riskLevel =
        mode === 'yolo' ? 'HIGH' : mode === 'conservative' ? 'LOW' : 'MEDIUM';
      return `🛡️ **Risk Assessment**\n\n**Current Risk Level**: ${riskLevel}\n**Mode**: ${mode.toUpperCase()}\n\n**Protocol Safety Scores:**\n- Aave V3: 9.5/10 ⭐\n- Compound V3: 9.2/10 ⭐\n- Curve: 8.8/10 ⭐\n- Yearn: 8.5/10 ⭐\n\n${mode === 'yolo' ? '⚠️ YOLO mode accepts higher risks for maximum yields. All moves are calculated risks with continuous monitoring.' : '✅ All recommended protocols maintain high safety standards with extensive audits.'}\n\nNeed details on any specific protocol?`;
    }

    // Gas optimization
    if (
      message.includes('gas') ||
      message.includes('fee') ||
      message.includes('cost')
    ) {
      const gasData = await this.analyzeGasConditions();
      return `⛽ **Gas Analysis**\n\n**Current Conditions**: ${gasData.currentGwei.toFixed(0)} gwei\n**Status**: ${gasData.isOptimal ? '🟢 OPTIMAL' : '🟡 MODERATE'}\n\n${gasData.isOptimal ? `💰 Perfect time for transactions! Estimated savings: ${gasData.savingsPercent.toFixed(0)}%` : '⏳ Consider waiting for better conditions or using Layer 2 solutions.'}\n\n**Layer 2 Options:**\n- Polygon: ~0.01 gwei\n- Arbitrum: ~0.1 gwei\n- Optimism: ~0.1 gwei\n\nShall I suggest Layer 2 opportunities?`;
    }

    // Decision making
    if (
      message.includes('decide') ||
      message.includes('recommend') ||
      message.includes('what should i do')
    ) {
      const decision = await this.makeInvestmentDecision(
        context.userAddress || 'demo',
        mode,
      );
      return `🧠 **AI Decision (${decision.confidence}% confidence)**\n\n**Recommendation**: ${decision.decision}\n\n**Key Reasons:**\n${decision.reasoning.map((r) => `- ${r}`).join('\n')}\n\n**Expected Outcome**: +${decision.expectedOutcome.apyImprovement?.toFixed(1)}% APY improvement\n\n${mode === 'yolo' ? '🔥 Ready to execute this YOLO play?' : '📊 Shall I proceed with this optimization?'}\n\nSay "execute" to proceed or "explain" for more details.`;
    }

    // Default response based on mode
    const modeGreeting = {
      yolo: '🔥 YOLO mode active! Ready to chase those moon yields?',
      aggressive:
        '⚡ Aggressive mode - hunting high yields with calculated risks!',
      balanced: '📊 Balanced approach - optimizing risk-adjusted returns.',
      conservative: '🛡️ Conservative mode - safety first, steady yields.',
    };

    return `👋 ${modeGreeting[mode]} I'm Alioth, your DeFi yield optimization specialist.\n\n**I can help you:**\n- Analyze current yields and opportunities\n- Assess portfolio and recommend optimizations\n- Execute rebalancing strategies\n- Monitor risks and market conditions\n- Switch between risk modes (conservative/balanced/aggressive/yolo)\n\n**Try asking:**\n- "What are the best yields right now?"\n- "Analyze my portfolio"\n- "Enable YOLO mode"\n- "What should I do?"\n\nWhat would you like to explore?`;
  }

  private async executeAction(
    userAddress: string,
    action: AIAction,
  ): Promise<any> {
    // Mock execution - in production, this would call actual services
    this.logger.log(
      `Executing ${action.type} action: ${action.amount} ${action.token} on ${action.protocol}`,
    );

    // Simulate execution delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      action,
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      status: 'success',
      timestamp: new Date(),
    };
  }

  private async trackDecisionPerformance(
    userAddress: string,
    decision: AIDecision,
    results: any[],
  ) {
    try {
      // Track the decision performance for learning
      this.logger.log(`📈 Tracking decision performance for ${userAddress}`);

      // In production, this would save to database for ML training
      const performanceData = {
        userAddress,
        decision,
        results,
        timestamp: new Date(),
        expectedAPY: decision.expectedOutcome.apyImprovement,
        confidence: decision.confidence,
      };

      // TODO: Save to performance tracking database
    } catch (error) {
      this.logger.error(
        `Failed to track decision performance: ${error.message}`,
      );
    }
  }
}
