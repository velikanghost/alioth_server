import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RiskTolerance {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
}

// New AI Integration DTOs matching the expected format
export class AIPortfolioOptimizationContentDto {
  @ApiProperty({
    description: 'Whether the request is structured',
    example: true,
  })
  @IsBoolean()
  structured: boolean;

  @ApiProperty({
    description: 'Natural language request text',
    example: 'optimize my portfolio',
  })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Input token symbol', example: 'USDC' })
  @IsString()
  inputToken: string;

  @ApiProperty({ description: 'Input amount as string', example: '5000' })
  @IsString()
  inputAmount: string;

  @ApiProperty({
    enum: RiskTolerance,
    description: 'User risk tolerance level',
    example: 'moderate',
  })
  @IsEnum(RiskTolerance)
  riskTolerance: RiskTolerance;
}

export class AIPortfolioOptimizationRequestDto {
  @ApiProperty({
    type: AIPortfolioOptimizationContentDto,
    description: 'Content object containing optimization parameters',
  })
  content: AIPortfolioOptimizationContentDto;
}

export interface AIAllocationResponse {
  stablecoins: number;
  bluechip: number;
  riskAssets: number;
}

export interface AIProtocolDetails {
  protocol: string;
  percentage: number;
  expectedAPY: number;
  riskScore: number;
  category: 'stablecoins' | 'bluechip' | 'riskAssets';
}

export interface AIOptimizationDataResponse {
  allocation: AIAllocationResponse;
  expectedAPY: number;
  protocols: AIProtocolDetails[];
  confidence: number;
  reasoning: string;
}

export class AIOptimizationResponseDto {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiProperty({
    type: 'object',
    description: 'AI optimization data',
    properties: {
      allocation: {
        type: 'object',
        properties: {
          stablecoins: { type: 'number' },
          bluechip: { type: 'number' },
          riskAssets: { type: 'number' },
        },
      },
      expectedAPY: { type: 'number' },
      protocols: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            protocol: { type: 'string' },
            percentage: { type: 'number' },
            expectedAPY: { type: 'number' },
            riskScore: { type: 'number' },
            category: { type: 'string' },
          },
        },
      },
      confidence: { type: 'number' },
      reasoning: { type: 'string' },
    },
  })
  data: AIOptimizationDataResponse;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;
}

// Existing DTOs for backwards compatibility
export class OptimizeDepositDto {
  @ApiProperty({ description: 'User wallet address' })
  @IsString()
  userAddress: string;

  @ApiProperty({ description: 'Input token contract address (e.g., USDC)' })
  @IsString()
  inputToken: string;

  @ApiProperty({
    description: 'Input amount in wei (e.g., "1000000000" for 1000 USDC)',
  })
  @IsString()
  inputAmount: string;

  @ApiProperty({
    enum: RiskTolerance,
    description: 'User risk tolerance level',
  })
  @IsEnum(RiskTolerance)
  riskTolerance: RiskTolerance;

  @ApiPropertyOptional({ description: 'Minimum yield threshold percentage' })
  @IsOptional()
  @IsNumber()
  minYieldThreshold?: number;
}

export interface AllocationStrategy {
  protocol: 'aave' | 'compound' | 'yearn';
  percentage: number;
  expectedAPY: number;
  riskScore: number;
}

export class OptimizationResponse {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Transaction hash of the optimization' })
  transactionHash: string;

  @ApiProperty({ description: 'AI-generated allocation strategy' })
  strategy: AllocationStrategy[];

  @ApiProperty({ description: 'Estimated annual percentage yield' })
  estimatedAPY: number;

  @ApiProperty({ description: 'AI reasoning for the strategy' })
  reasoning: string;

  @ApiProperty({ description: 'Unique tracking ID for this optimization' })
  trackingId: string;
}

export interface YieldAnalysisRequest {
  inputToken: string;
  inputAmount: string;
  currentMarketData: MarketData;
  userRiskProfile: RiskProfile;
}

export interface YieldAnalysisResponse {
  allocation: AllocationStrategy[];
  confidence: number;
  reasoning: string;
  marketAnalysis: MarketAnalysis;
}

export interface MarketData {
  prices: Record<string, number>;
  yields: Record<string, number>;
  volatility: Record<string, number>;
  correlations: Record<string, number>;
  timestamp: Date;
}

export interface RiskProfile {
  tolerance: RiskTolerance;
  minYieldThreshold: number;
  maxDrawdown: number;
  timeHorizon: string;
}

export interface MarketAnalysis {
  trend: 'bullish' | 'bearish' | 'sideways';
  volatilityLevel: 'low' | 'medium' | 'high';
  liquidityCondition: 'excellent' | 'good' | 'fair' | 'poor';
  recommendation: string;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  gasUsed?: number;
  blockNumber?: number;
  error?: string;
}

export interface DemoStatusResponse {
  stage:
    | 'optimization_executed'
    | 'automation_registered'
    | 'rebalance_triggered';
  chainlinkEvents: any[];
  currentPerformance: PerformanceMetrics;
  nextRebalanceEstimate: Date;
}

export interface PerformanceMetrics {
  totalValue: number;
  totalReturn: number;
  apy: number;
  riskScore: number;
  lastUpdate: Date;
}
