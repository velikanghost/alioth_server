import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AllocationParams {
  availableTokens: string[];
  depositAmount: bigint;
  depositToken: string;
  userRiskTolerance: number; // 1-10 scale
  timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG'; // < 1 month, 1-6 months, > 6 months
  maxSlippage: number;
  maxGasCost: number;
  prohibitedTokens?: string[];
  minimumYield?: number;
}

export interface AllocationStrategy {
  allocations: TokenAllocation[];
  totalExpectedYield: number;
  totalRiskScore: number;
  diversificationScore: number;
  gasEstimate: number;
  executionSteps: ExecutionStep[];
  confidence: number; // 0-100%
  reasoning: string[];
}

export interface TokenAllocation {
  token: string;
  symbol: string;
  percentage: number;
  amount: bigint;
  expectedYield: number;
  riskScore: number;
  protocol: string;
  reasoning: string;
}

export interface ExecutionStep {
  type: 'SWAP' | 'DEPOSIT' | 'APPROVE';
  fromToken?: string;
  toToken?: string;
  amount?: bigint;
  protocol?: string;
  estimatedGas: number;
  order: number;
}

export interface RiskAssessment {
  overallRisk: number; // 1-10 scale
  diversificationBenefit: number;
  concentrationRisk: number;
  liquidityRisk: number;
  protocolRisk: number;
  marketRisk: number;
  recommendations: string[];
  warnings: string[];
}

export interface OptimizationParams {
  tokens: string[];
  amounts: bigint[];
  riskTolerance: number;
  yieldWeighting: number; // 0-1, how much to prioritize yield vs risk
  diversificationWeight: number; // 0-1, how much to prioritize diversification
  constraints: AllocationConstraints;
}

export interface AllocationConstraints {
  maxTokens: number;
  minAllocationPerToken: number; // Minimum percentage per token
  maxAllocationPerToken: number; // Maximum percentage per token
  requireStablecoins: boolean;
  maxProtocolExposure: number; // Max exposure to single protocol
}

export interface OptimizedAllocation {
  allocations: TokenAllocation[];
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  diversificationScore: number;
  efficiencyScore: number; // How close to efficient frontier
}

@Injectable()
export class CrossTokenAllocationEngine {
  private readonly logger = new Logger(CrossTokenAllocationEngine.name);

  // Risk-free rate for Sharpe ratio calculation (approximate ETH staking yield)
  private readonly RISK_FREE_RATE = 0.04; // 4%

  // Protocol risk scores (1-10, lower is safer)
  private readonly PROTOCOL_RISKS = {
    'Aave V3': 2,
    Compound: 3,
    Yearn: 4,
    'Uniswap V3': 5,
    SushiSwap: 6,
  };

  constructor(private configService: ConfigService) {}

  async calculateOptimalAllocation(
    params: AllocationParams,
  ): Promise<AllocationStrategy> {
    this.logger.log(
      `Calculating optimal allocation for ${params.depositToken}`,
    );

    try {
      // 1. Filter available tokens based on constraints
      const eligibleTokens = await this.filterEligibleTokens(params);

      // 2. Get market data for eligible tokens
      const marketData = await this.getMarketDataForTokens(eligibleTokens);

      // 3. Calculate correlation matrix
      const correlationMatrix =
        await this.calculateCorrelationMatrix(eligibleTokens);

      // 4. Apply Modern Portfolio Theory optimization
      const baseAllocation = await this.optimizePortfolio(
        marketData,
        correlationMatrix,
        params.userRiskTolerance,
        params.timeHorizon,
      );

      // 5. Apply practical constraints and adjustments
      const adjustedAllocation = await this.applyPracticalConstraints(
        baseAllocation,
        params,
        marketData,
      );

      // 6. Generate execution steps
      const executionSteps = await this.generateExecutionSteps(
        adjustedAllocation,
        params.depositToken,
        params.depositAmount,
      );

      // 7. Calculate total metrics
      const totalExpectedYield =
        this.calculateWeightedYield(adjustedAllocation);
      const totalRiskScore = this.calculatePortfolioRisk(
        adjustedAllocation,
        correlationMatrix,
      );
      const diversificationScore = this.calculateDiversificationScore(
        adjustedAllocation,
        correlationMatrix,
      );

      // 8. Estimate gas costs
      const gasEstimate = executionSteps.reduce(
        (sum, step) => sum + step.estimatedGas,
        0,
      );

      // 9. Calculate confidence score
      const confidence = this.calculateConfidenceScore(
        adjustedAllocation,
        marketData,
        params,
      );

      // 10. Generate reasoning
      const reasoning = this.generateReasoningExplanation(
        adjustedAllocation,
        params,
        {
          totalExpectedYield,
          totalRiskScore,
          diversificationScore,
        },
      );

      return {
        allocations: adjustedAllocation,
        totalExpectedYield,
        totalRiskScore,
        diversificationScore,
        gasEstimate,
        executionSteps,
        confidence,
        reasoning,
      };
    } catch (error) {
      this.logger.error(
        `Error calculating optimal allocation: ${error.message}`,
      );
      throw new Error(
        `Failed to calculate optimal allocation: ${error.message}`,
      );
    }
  }

  async assessPortfolioRisk(
    allocation: AllocationStrategy,
  ): Promise<RiskAssessment> {
    this.logger.log('Assessing portfolio risk');

    try {
      const allocations = allocation.allocations;

      // Calculate different risk components
      const overallRisk = allocation.totalRiskScore;
      const diversificationBenefit =
        this.calculateDiversificationBenefit(allocations);
      const concentrationRisk = this.calculateConcentrationRisk(allocations);
      const liquidityRisk = await this.calculateLiquidityRisk(allocations);
      const protocolRisk = this.calculateProtocolRisk(allocations);
      const marketRisk = this.calculateMarketRisk(allocations);

      // Generate recommendations and warnings
      const recommendations: string[] = [];
      const warnings: string[] = [];

      if (concentrationRisk > 7) {
        warnings.push(
          'High concentration risk - consider more diversification',
        );
        recommendations.push(
          'Reduce allocation to top holdings and diversify across more tokens',
        );
      }

      if (protocolRisk > 6) {
        warnings.push('High protocol risk exposure');
        recommendations.push(
          'Consider spreading allocations across more DeFi protocols',
        );
      }

      if (liquidityRisk > 5) {
        warnings.push('Some allocations have limited liquidity');
        recommendations.push(
          'Consider allocating more to highly liquid tokens',
        );
      }

      if (diversificationBenefit < 3) {
        recommendations.push(
          'Increase diversification to reduce overall portfolio risk',
        );
      }

      if (overallRisk > 8) {
        warnings.push('Very high risk portfolio');
        recommendations.push(
          'Consider reducing risk by allocating to more stable assets',
        );
      }

      return {
        overallRisk,
        diversificationBenefit,
        concentrationRisk,
        liquidityRisk,
        protocolRisk,
        marketRisk,
        recommendations,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Error assessing portfolio risk: ${error.message}`);
      throw new Error(`Failed to assess portfolio risk: ${error.message}`);
    }
  }

  async optimizeForRiskAdjustedReturns(
    params: OptimizationParams,
  ): Promise<OptimizedAllocation> {
    this.logger.log('Optimizing for risk-adjusted returns');

    try {
      // Get market data
      const marketData = await this.getMarketDataForTokens(params.tokens);
      const correlationMatrix = await this.calculateCorrelationMatrix(
        params.tokens,
      );

      // Calculate expected returns and risks for each token
      const tokenMetrics = marketData.map((data) => ({
        token: data.token,
        expectedReturn: data.expectedYield,
        risk: data.riskScore / 10, // Normalize to 0-1
        liquidity: data.liquidityUSD,
      }));

      // Apply mean-variance optimization with constraints
      const weights = await this.meanVarianceOptimization(
        tokenMetrics,
        correlationMatrix,
        params.constraints,
        params.yieldWeighting,
        params.diversificationWeight,
      );

      // Create allocations
      const allocations: TokenAllocation[] = weights
        .map((weight, index) => {
          const tokenData = marketData[index];
          const amount =
            (params.amounts[index] * BigInt(Math.floor(weight * 10000))) /
            BigInt(10000);

          return {
            token: tokenData.token,
            symbol: tokenData.symbol,
            percentage: weight * 100,
            amount,
            expectedYield: tokenData.expectedYield,
            riskScore: tokenData.riskScore,
            protocol: tokenData.protocol,
            reasoning: `Optimal weight ${(weight * 100).toFixed(1)}% based on risk-adjusted returns`,
          };
        })
        .filter(
          (allocation) =>
            allocation.percentage > params.constraints.minAllocationPerToken,
        );

      // Calculate portfolio metrics
      const expectedReturn = this.calculateWeightedYield(allocations);
      const expectedRisk = this.calculatePortfolioRisk(
        allocations,
        correlationMatrix,
      );
      const sharpeRatio = (expectedReturn - this.RISK_FREE_RATE) / expectedRisk;
      const diversificationScore = this.calculateDiversificationScore(
        allocations,
        correlationMatrix,
      );
      const efficiencyScore = this.calculateEfficiencyScore(
        expectedReturn,
        expectedRisk,
      );

      return {
        allocations,
        expectedReturn,
        expectedRisk,
        sharpeRatio,
        diversificationScore,
        efficiencyScore,
      };
    } catch (error) {
      this.logger.error(
        `Error optimizing for risk-adjusted returns: ${error.message}`,
      );
      throw new Error(
        `Failed to optimize for risk-adjusted returns: ${error.message}`,
      );
    }
  }

  private async filterEligibleTokens(
    params: AllocationParams,
  ): Promise<string[]> {
    let eligible = [...params.availableTokens];

    // Remove prohibited tokens
    if (params.prohibitedTokens) {
      eligible = eligible.filter(
        (token) => !params.prohibitedTokens!.includes(token),
      );
    }

    // Remove tokens with insufficient liquidity (mock implementation)
    // In production, check actual liquidity from DEXes
    eligible = eligible.filter((token) => {
      // Mock liquidity check - assume all tokens in our list have sufficient liquidity
      return true;
    });

    return eligible;
  }

  private async getMarketDataForTokens(tokens: string[]): Promise<any[]> {
    // Mock market data - in production, integrate with ChainlinkDataService
    const mockData = tokens.map((token) => ({
      token,
      symbol: this.getTokenSymbol(token),
      expectedYield: 0.03 + Math.random() * 0.05, // 3-8% yield
      riskScore: 1 + Math.random() * 4, // 1-5 risk score
      liquidityUSD: 1000000 + Math.random() * 10000000, // 1M-11M liquidity
      protocol: 'Aave V3', // Simplified
      volatility: 0.1 + Math.random() * 0.2, // 10-30% volatility
    }));

    return mockData;
  }

  private async calculateCorrelationMatrix(
    tokens: string[],
  ): Promise<number[][]> {
    const n = tokens.length;
    const matrix: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    // Fill diagonal with 1s (perfect self-correlation)
    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1;
    }

    // Fill off-diagonal with mock correlations
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const correlation = 0.1 + Math.random() * 0.6; // 0.1-0.7 correlation
        matrix[i][j] = correlation;
        matrix[j][i] = correlation; // Symmetric matrix
      }
    }

    return matrix;
  }

  private async optimizePortfolio(
    marketData: any[],
    correlationMatrix: number[][],
    riskTolerance: number,
    timeHorizon: string,
  ): Promise<TokenAllocation[]> {
    // Simple optimization based on risk tolerance and time horizon
    const n = marketData.length;
    const weights: number[] = new Array(n);

    // Adjust risk preference based on inputs
    const riskPreference = riskTolerance / 10; // Normalize to 0-1
    const timeMultiplier =
      timeHorizon === 'LONG' ? 1.2 : timeHorizon === 'MEDIUM' ? 1.0 : 0.8;

    // Calculate initial weights based on risk-adjusted returns
    let totalScore = 0;
    const scores = marketData.map((data) => {
      const riskAdjustedReturn =
        data.expectedYield * riskPreference * timeMultiplier;
      const score = riskAdjustedReturn / Math.max(data.riskScore, 1);
      totalScore += score;
      return score;
    });

    // Normalize weights
    for (let i = 0; i < n; i++) {
      weights[i] = scores[i] / totalScore;
    }

    // Apply diversification constraints
    const maxWeight = 0.4; // No more than 40% in any single token
    const minWeight = 0.05; // At least 5% if included

    for (let i = 0; i < n; i++) {
      if (weights[i] > maxWeight) {
        weights[i] = maxWeight;
      } else if (weights[i] < minWeight) {
        weights[i] = 0;
      }
    }

    // Renormalize
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < n; i++) {
      weights[i] = weights[i] / totalWeight;
    }

    // Create allocations
    return marketData
      .map((data, index) => ({
        token: data.token,
        symbol: data.symbol,
        percentage: weights[index] * 100,
        amount: BigInt(0), // Will be calculated later
        expectedYield: data.expectedYield,
        riskScore: data.riskScore,
        protocol: data.protocol,
        reasoning: `Allocated ${(weights[index] * 100).toFixed(1)}% based on risk-adjusted optimization`,
      }))
      .filter((allocation) => allocation.percentage > 0);
  }

  private async applyPracticalConstraints(
    allocation: TokenAllocation[],
    params: AllocationParams,
    marketData: any[],
  ): Promise<TokenAllocation[]> {
    // Apply minimum yield constraint
    if (params.minimumYield) {
      return allocation.filter(
        (alloc) => alloc.expectedYield >= params.minimumYield!,
      );
    }

    return allocation;
  }

  private async generateExecutionSteps(
    allocations: TokenAllocation[],
    depositToken: string,
    depositAmount: bigint,
  ): Promise<ExecutionStep[]> {
    const steps: ExecutionStep[] = [];
    let order = 1;

    for (const allocation of allocations) {
      const allocAmount =
        (depositAmount * BigInt(Math.floor(allocation.percentage * 100))) /
        BigInt(10000);
      allocation.amount = allocAmount;

      if (allocation.token !== depositToken) {
        // Need to swap
        steps.push({
          type: 'APPROVE',
          fromToken: depositToken,
          amount: allocAmount,
          estimatedGas: 50000,
          order: order++,
        });

        steps.push({
          type: 'SWAP',
          fromToken: depositToken,
          toToken: allocation.token,
          amount: allocAmount,
          estimatedGas: 150000,
          order: order++,
        });
      }

      // Deposit to protocol
      steps.push({
        type: 'APPROVE',
        fromToken: allocation.token,
        amount: allocAmount,
        protocol: allocation.protocol,
        estimatedGas: 50000,
        order: order++,
      });

      steps.push({
        type: 'DEPOSIT',
        fromToken: allocation.token,
        amount: allocAmount,
        protocol: allocation.protocol,
        estimatedGas: 200000,
        order: order++,
      });
    }

    return steps;
  }

  private calculateWeightedYield(allocations: TokenAllocation[]): number {
    let totalYield = 0;
    let totalWeight = 0;

    for (const allocation of allocations) {
      const weight = allocation.percentage / 100;
      totalYield += allocation.expectedYield * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalYield / totalWeight : 0;
  }

  private calculatePortfolioRisk(
    allocations: TokenAllocation[],
    correlationMatrix: number[][],
  ): number {
    if (allocations.length === 0) return 0;

    // Simplified portfolio risk calculation
    let totalRisk = 0;
    let totalWeight = 0;

    for (const allocation of allocations) {
      const weight = allocation.percentage / 100;
      totalRisk += allocation.riskScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalRisk / totalWeight : 0;
  }

  private calculateDiversificationScore(
    allocations: TokenAllocation[],
    correlationMatrix: number[][],
  ): number {
    if (allocations.length <= 1) return 0;

    // Higher score for more diversification and lower correlations
    const numTokens = allocations.length;
    const maxTokens = 10; // Theoretical maximum for this scoring

    // Base score from number of tokens
    let score = (numTokens / maxTokens) * 5;

    // Adjust for allocation distribution (penalize concentration)
    const maxAllocation = Math.max(...allocations.map((a) => a.percentage));
    const concentrationPenalty = (maxAllocation - 10) / 90; // 0 if max is 10%, 1 if max is 100%
    score = score * (1 - concentrationPenalty * 0.5);

    return Math.min(Math.max(score, 0), 5);
  }

  private calculateConfidenceScore(
    allocations: TokenAllocation[],
    marketData: any[],
    params: AllocationParams,
  ): number {
    let confidence = 80; // Base confidence

    // Reduce confidence for high-risk allocations
    const avgRisk =
      allocations.reduce((sum, a) => sum + a.riskScore, 0) / allocations.length;
    if (avgRisk > 4) confidence -= 20;
    else if (avgRisk > 3) confidence -= 10;

    // Reduce confidence for poor diversification
    if (allocations.length < 3) confidence -= 15;

    // Reduce confidence for high slippage tolerance
    if (params.maxSlippage > 0.05) confidence -= 10;

    return Math.max(confidence, 30);
  }

  private generateReasoningExplanation(
    allocations: TokenAllocation[],
    params: AllocationParams,
    metrics: {
      totalExpectedYield: number;
      totalRiskScore: number;
      diversificationScore: number;
    },
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(
      `Portfolio optimized for ${params.userRiskTolerance}/10 risk tolerance with ${params.timeHorizon.toLowerCase()} time horizon`,
    );

    reasoning.push(
      `Expected portfolio yield: ${(metrics.totalExpectedYield * 100).toFixed(2)}% with risk score ${metrics.totalRiskScore.toFixed(1)}/10`,
    );

    reasoning.push(
      `Diversification across ${allocations.length} tokens with score ${metrics.diversificationScore.toFixed(1)}/5`,
    );

    const topAllocation = allocations.reduce((max, current) =>
      current.percentage > max.percentage ? current : max,
    );

    reasoning.push(
      `Largest allocation: ${topAllocation.percentage.toFixed(1)}% in ${topAllocation.symbol} (${topAllocation.expectedYield * 100}% APY)`,
    );

    return reasoning;
  }

  // Additional helper methods for risk calculations

  private calculateDiversificationBenefit(
    allocations: TokenAllocation[],
  ): number {
    // Higher benefit for more even distribution
    if (allocations.length <= 1) return 0;

    const weights = allocations.map((a) => a.percentage / 100);
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);
    const maxHerfindahl = 1; // Completely concentrated
    const minHerfindahl = 1 / allocations.length; // Perfectly distributed

    // Convert to 1-10 scale (higher is better)
    return (
      10 *
      (1 - (herfindahlIndex - minHerfindahl) / (maxHerfindahl - minHerfindahl))
    );
  }

  private calculateConcentrationRisk(allocations: TokenAllocation[]): number {
    const maxAllocation = Math.max(...allocations.map((a) => a.percentage));
    return (maxAllocation / 100) * 10; // Scale to 1-10
  }

  private async calculateLiquidityRisk(
    allocations: TokenAllocation[],
  ): Promise<number> {
    // Mock liquidity risk based on token liquidity
    const avgLiquidity = allocations.reduce((sum, a) => {
      const mockLiquidity = this.getMockLiquidity(a.token);
      return sum + (mockLiquidity * a.percentage) / 100;
    }, 0);

    // Higher liquidity = lower risk
    if (avgLiquidity > 10000000) return 1; // > $10M
    if (avgLiquidity > 5000000) return 2; // > $5M
    if (avgLiquidity > 1000000) return 4; // > $1M
    return 7; // < $1M
  }

  private calculateProtocolRisk(allocations: TokenAllocation[]): number {
    const protocolExposure: Record<string, number> = {};

    for (const allocation of allocations) {
      const protocol = allocation.protocol;
      protocolExposure[protocol] =
        (protocolExposure[protocol] || 0) + allocation.percentage;
    }

    // Calculate weighted average protocol risk
    let totalRisk = 0;
    let totalWeight = 0;

    for (const [protocol, exposure] of Object.entries(protocolExposure)) {
      const risk =
        (this.PROTOCOL_RISKS as Record<string, number>)[protocol] || 5;
      totalRisk += risk * (exposure / 100);
      totalWeight += exposure / 100;
    }

    return totalWeight > 0 ? totalRisk / totalWeight : 5;
  }

  private calculateMarketRisk(allocations: TokenAllocation[]): number {
    // Simplified market risk based on token volatilities
    let totalRisk = 0;
    let totalWeight = 0;

    for (const allocation of allocations) {
      const weight = allocation.percentage / 100;
      const volatilityRisk = allocation.riskScore; // Simplified
      totalRisk += volatilityRisk * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalRisk / totalWeight : 5;
  }

  private async meanVarianceOptimization(
    tokenMetrics: any[],
    correlationMatrix: number[][],
    constraints: AllocationConstraints,
    yieldWeighting: number,
    diversificationWeight: number,
  ): Promise<number[]> {
    // Simplified mean-variance optimization
    const n = tokenMetrics.length;
    const weights: number[] = new Array(n);

    // Start with equal weights
    for (let i = 0; i < n; i++) {
      weights[i] = 1 / n;
    }

    // Apply constraints
    for (let i = 0; i < n; i++) {
      if (weights[i] > constraints.maxAllocationPerToken / 100) {
        weights[i] = constraints.maxAllocationPerToken / 100;
      }
      if (weights[i] < constraints.minAllocationPerToken / 100) {
        weights[i] = constraints.minAllocationPerToken / 100;
      }
    }

    // Renormalize
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < n; i++) {
      weights[i] = weights[i] / totalWeight;
    }

    return weights;
  }

  private calculateEfficiencyScore(
    expectedReturn: number,
    expectedRisk: number,
  ): number {
    // Simple efficiency calculation - in production, compare against efficient frontier
    const efficiency = expectedReturn / Math.max(expectedRisk, 0.01);
    return Math.min(efficiency * 20, 10); // Scale to 0-10
  }

  private getMockLiquidity(token: string): number {
    const mockLiquidities: Record<string, number> = {
      AAVE: 5000000,
      WETH: 50000000,
      WBTC: 25000000,
      LINK: 8000000,
    };

    const symbol = this.getTokenSymbol(token);
    return mockLiquidities[symbol] || 1000000;
  }

  private getTokenSymbol(token: string): string {
    const symbolMap: Record<string, string> = {
      '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': 'AAVE',
      '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': 'WETH',
      '0x29f2D40B0605204364af54EC677bD022dA425d03': 'WBTC',
      '0x779877A7B0D9E8603169DdbD7836e478b4624789': 'LINK',
    };

    return symbolMap[token] || token;
  }
}
