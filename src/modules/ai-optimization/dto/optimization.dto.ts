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

export class OptimizeDepositDto {
  @ApiProperty({
    description:
      'Input token contract address (e.g., 0x0000000000000000000000000000000000000000)',
  })
  @IsString()
  inputTokenAddress: string;

  @ApiProperty({ description: 'Input token symbol (e.g., USDC, WBTC, ETH)' })
  @IsString()
  inputTokenSymbol: string;

  @ApiProperty({
    description:
      'Input amount in wei (e.g., "1000000000" for 1000 USDC with 6 decimals)',
  })
  @IsString()
  inputTokenAmount: string;

  @ApiProperty({
    description: 'USD value of the deposit',
    example: 3000,
  })
  @IsNumber()
  usdAmount: number;

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

// Token configuration interface
export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
}

// AI request interface (what we send to AI)
export interface AIYieldAnalysisRequest {
  inputTokenAddress: string;
  usdAmount: number; // USD value instead of token amount
  riskTolerance: string;
}

// New Direct Deposit DTOs for AI Agent Integration
export class DirectDepositRequestDto {
  @ApiProperty({
    description: 'Alioth wallet ID to use for the transaction',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  aliothWalletId: string;

  @ApiProperty({
    description: 'Input token contract address',
    example: '0xf8fb3713d459d7c1018bd0a49d19b4c44290ebe5',
  })
  @IsString()
  inputTokenAddress: string;

  @ApiProperty({
    description: 'Input token symbol',
    example: 'LINK',
    enum: ['LINK', 'WBTC', 'WETH', 'AAVE', 'GHO', 'EURS'],
  })
  @IsString()
  inputTokenSymbol: string;

  @ApiProperty({
    description: 'Input token amount in wei',
    example: '2000000000000000000',
  })
  @IsString()
  inputTokenAmount: string;

  @ApiProperty({
    description: 'USD value of the deposit',
    example: 3000,
  })
  @IsNumber()
  usdAmount: number;

  @ApiProperty({
    enum: RiskTolerance,
    description: 'User risk tolerance level',
    example: 'moderate',
  })
  @IsEnum(RiskTolerance)
  riskTolerance: RiskTolerance;
}

export interface DirectDepositInputToken {
  address: string;
  symbol: string;
  amount: string;
  usdValue: number;
}

export interface DirectDepositRecommendation {
  protocol: string;
  percentage: number;
  expectedAPY: number;
  riskScore: number;
  tvl: number;
  chain: string;
  token: string;
  amount: string;
}

export interface DirectDepositOptimization {
  strategy: string;
  recommendations: DirectDepositRecommendation[];
  expectedAPY: number;
  confidence: number;
  reasoning: string;
}

export interface DirectDepositMarketAnalysis {
  timestamp: string;
  totalTvl: number;
  averageYield: number;
  topProtocols: string[];
  marketCondition: string;
}

export interface DirectDepositData {
  inputToken: DirectDepositInputToken;
  optimization: DirectDepositOptimization;
  marketAnalysis: DirectDepositMarketAnalysis;
  timestamp: string;
  vaultExecutions?: VaultExecutionResult[];
}

export interface VaultExecutionResult {
  protocol: string;
  amount: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  shares?: string;
  gasUsed?: number;
  error?: string;
}

export class DirectDepositResponseDto {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiProperty({ description: 'Direct deposit optimization data' })
  data: DirectDepositData;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;
}

// Supported tokens configuration (Sepolia testnet addresses)
export const SUPPORTED_TOKENS = {
  LINK: '0xf8fb3713d459d7c1018bd0a49d19b4c44290ebe5',
  WBTC: '0x29f2D40B0605204364af54EC677bD022dA425d03', // Sepolia WBTC
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH
  AAVE: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a', // Sepolia AAVE
  GHO: '0xc4bF5CbDaBE595361438F8c6a187bDc330539c60', // Sepolia GHO
  EURS: '0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E', // Sepolia EURS
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
} as const;

export type SupportedTokenSymbol = keyof typeof SUPPORTED_TOKENS;
