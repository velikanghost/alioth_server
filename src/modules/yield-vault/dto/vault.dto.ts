import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEthereumAddress,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RiskProfile } from '../schemas/user-vault.schema';

export class DepositDto {
  @ApiProperty({
    description: 'User wallet address',
    example: '0x28738040d191ff30673f546FB6BF997E6cdA6dbF',
  })
  @IsString()
  @IsEthereumAddress()
  userAddress: string;

  @ApiProperty({
    description: 'Token contract address',
    example: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
  })
  @IsString()
  @IsEthereumAddress()
  tokenAddress: string;

  @ApiProperty({
    description: 'Amount to deposit in wei',
    example: '1000000000000000000',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    description: 'Chain ID',
    example: 11155111,
  })
  @IsNumber()
  chainId: number;

  @ApiPropertyOptional({
    description: 'Minimum shares expected (slippage protection)',
    example: '950000000000000000',
  })
  @IsOptional()
  @IsString()
  minShares?: string;

  @ApiPropertyOptional({
    description: 'Target protocol for yield optimization',
    example: 'aave',
    enum: ['aave', 'compound', 'yearn'],
  })
  @IsOptional()
  @IsString()
  targetProtocol?: string;
}

export class WithdrawDto {
  @ApiProperty({
    description: 'User wallet address',
    example: '0x28738040d191ff30673f546FB6BF997E6cdA6dbF',
  })
  @IsString()
  @IsEthereumAddress()
  userAddress: string;

  @ApiProperty({
    description: 'Token contract address',
    example: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
  })
  @IsString()
  @IsEthereumAddress()
  tokenAddress: string;

  @ApiProperty({
    description: 'Amount of shares to burn',
    example: '1000000000000000000',
  })
  @IsString()
  shares: string;

  @ApiProperty({
    description: 'Chain ID',
    example: 11155111,
  })
  @IsNumber()
  chainId: number;

  @ApiPropertyOptional({
    description: 'Minimum tokens expected (slippage protection)',
    example: '950000000000000000',
  })
  @IsOptional()
  @IsString()
  minAmount?: string;

  @ApiPropertyOptional({
    description: 'Target protocol for withdrawal optimization',
    example: 'aave',
    enum: ['aave', 'compound', 'yearn'],
  })
  @IsOptional()
  @IsString()
  targetProtocol?: string;
}

export class ApproveDto {
  @ApiProperty({
    description: 'User wallet address',
    example: '0x28738040d191ff30673f546FB6BF997E6cdA6dbF',
  })
  @IsString()
  @IsEthereumAddress()
  userAddress: string;

  @ApiProperty({
    description: 'Alioth wallet ID to use for the transaction',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  aliothWalletId: string;

  @ApiProperty({
    description: 'Token contract address to approve',
    example: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
  })
  @IsString()
  @IsEthereumAddress()
  tokenAddress: string;

  @ApiProperty({
    description: 'Amount to approve (in wei)',
    example: '1000000000000000000',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    description: 'Chain ID',
    example: 11155111,
  })
  @IsNumber()
  chainId: number;
}

export class UserPreferencesDto {
  @ApiPropertyOptional({
    description: 'Risk profile preference',
    enum: RiskProfile,
    example: RiskProfile.MODERATE,
  })
  @IsOptional()
  @IsEnum(RiskProfile)
  riskProfile?: RiskProfile;

  @ApiPropertyOptional({
    description: 'Enable automatic rebalancing',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoRebalance?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum slippage tolerance (percentage)',
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxSlippage?: number;

  @ApiPropertyOptional({
    description: 'APY difference threshold for rebalancing',
    example: 2.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  rebalanceThreshold?: number;
}

export class AIOptimizedDepositRecommendationDto {
  @ApiProperty({
    description: 'Protocol name for the recommendation',
    example: 'aave',
  })
  @IsString()
  protocol: string;

  @ApiProperty({
    description: 'Percentage allocation for this protocol',
    example: 40,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({
    description: 'Expected APY for this allocation',
    example: 4.5,
  })
  @IsNumber()
  expectedAPY: number;

  @ApiProperty({
    description: 'Risk score for this allocation (1-10)',
    example: 3,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  riskScore: number;

  @ApiProperty({
    description: 'Amount to deposit for this allocation (in wei)',
    example: '400000000000000000000',
  })
  @IsString()
  amount: string;
}

export class AIOptimizedDepositDto {
  @ApiProperty({
    description: 'User wallet address',
    example: '0x28738040d191ff30673f546FB6BF997E6cdA6dbF',
  })
  @IsString()
  @IsEthereumAddress()
  userAddress: string;

  @ApiProperty({
    description: 'Input token contract address',
    example: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
  })
  @IsString()
  @IsEthereumAddress()
  inputTokenAddress: string;

  @ApiProperty({
    description: 'Input token symbol',
    example: 'USDC',
  })
  @IsString()
  inputTokenSymbol: string;

  @ApiProperty({
    description: 'Total input token amount (in wei)',
    example: '1000000000000000000000',
  })
  @IsString()
  inputTokenAmount: string;

  @ApiProperty({
    description: 'USD value of the deposit',
    example: 1000,
  })
  @IsNumber()
  usdAmount: number;

  @ApiProperty({
    description: 'AI optimization recommendations',
    type: [AIOptimizedDepositRecommendationDto],
  })
  @IsArray()
  recommendations: AIOptimizedDepositRecommendationDto[];
}

export class VaultBalanceResponseDto {
  @ApiProperty()
  chainId: number;

  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  tokenSymbol: string;

  @ApiProperty()
  shares: string;

  @ApiProperty()
  estimatedValue: number;

  @ApiProperty()
  yieldEarned: number;

  @ApiProperty()
  depositedAmount: string;

  @ApiProperty()
  depositedValueUSD: number;

  @ApiProperty()
  currentAPY: number;

  @ApiProperty()
  lastUpdated: Date;
}

export class UserVaultResponseDto {
  @ApiProperty()
  userAddress: string;

  @ApiProperty({ type: [VaultBalanceResponseDto] })
  vaultBalances: VaultBalanceResponseDto[];

  @ApiProperty()
  totalValueLocked: number;

  @ApiProperty()
  totalYieldEarned: number;

  @ApiProperty({ enum: RiskProfile })
  riskProfile: RiskProfile;

  @ApiProperty()
  statistics: {
    totalTransactions: number;
    totalDeposits: number;
    totalWithdrawals: number;
    averageAPY: number;
    bestPerformingToken: string;
    totalRebalances: number;
    lastActivityAt: Date;
  };
}

export class APRHistoryDto {
  @ApiPropertyOptional({
    description: 'Token address filter',
    example: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
  })
  @IsOptional()
  @IsString()
  @IsEthereumAddress()
  tokenAddress?: string;

  @ApiPropertyOptional({
    description: 'Chain ID filter',
    example: 11155111,
  })
  @IsOptional()
  @IsNumber()
  chainId?: number;

  @ApiPropertyOptional({
    description: 'Protocol name filter',
    example: 'aave',
  })
  @IsOptional()
  @IsString()
  protocolName?: string;

  @ApiPropertyOptional({
    description: 'Hours to look back',
    example: 24,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8760) // Max 1 year
  hours?: number;
}

export class APRSnapshotResponseDto {
  @ApiProperty()
  chainId: number;

  @ApiProperty()
  protocolName: string;

  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  tokenSymbol: string;

  @ApiProperty()
  supplyAPR: number;

  @ApiProperty()
  totalAPY: number;

  @ApiProperty()
  totalValueLocked: number;

  @ApiProperty()
  utilizationRate: number;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  riskMetrics: {
    protocolRiskScore: number;
    liquidityRisk: number;
    smartContractRisk: number;
    volatilityScore: number;
  };
}

export class VaultPerformanceResponseDto {
  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  tokenSymbol: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  totalValueLocked: number;

  @ApiProperty()
  currentAPR: number;

  @ApiProperty()
  performance: {
    totalYieldGenerated: number;
    averageAPY: number;
    bestAPY: number;
    rebalanceCount: number;
  };

  @ApiProperty()
  activeStrategies: Array<{
    protocolName: string;
    allocation: number;
    tvl: number;
    apy: number;
    lastUpdated: Date;
  }>;

  @ApiProperty()
  lastRebalanceAt: Date;

  @ApiProperty()
  nextRebalanceAt: Date;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userAddress: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  tokenSymbol: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  amountUSD: number;

  @ApiProperty()
  txHash: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  confirmedAt: Date;

  @ApiProperty()
  gasUsed: number;

  @ApiProperty()
  shares: {
    sharesBefore: string;
    sharesAfter: string;
    sharesDelta: string;
  };

  @ApiPropertyOptional({
    description: 'AI-specific metadata for optimized deposits',
    type: 'object',
    properties: {
      protocol: { type: 'string' },
      expectedAPY: { type: 'number' },
      riskScore: { type: 'number' },
      percentage: { type: 'number' },
    },
  })
  @IsOptional()
  aiMetadata?: {
    protocol: string;
    expectedAPY: number;
    riskScore: number;
    percentage: number;
  };
}

export class AIRecommendationDto {
  @ApiProperty({
    description: 'Target protocol for this allocation',
    example: 'compound-v3',
  })
  @IsString()
  protocol: string;

  @ApiProperty({
    description: 'Percentage allocation for this protocol',
    example: 60,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({
    description: 'Expected APY for this allocation',
    example: 0.1837140622992,
  })
  @IsNumber()
  expectedAPY: number;

  @ApiProperty({
    description: 'Risk score for this allocation (1-10)',
    example: 3,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  riskScore: number;

  @ApiProperty({
    description: 'Total value locked in this protocol',
    example: 1807378.9641161798,
  })
  @IsNumber()
  tvl: number;

  @ApiProperty({
    description: 'Target blockchain for this allocation',
    example: 'sepolia',
  })
  @IsString()
  chain: string;

  @ApiProperty({
    description: 'Token symbol',
    example: 'USDC',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Amount to allocate (in wei)',
    example: '600000000',
  })
  @IsString()
  amount: string;
}

export class MultiChainDepositDto extends DepositDto {
  @ApiPropertyOptional({
    description: 'AI recommendations for multi-chain allocation',
    type: [AIRecommendationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AIRecommendationDto)
  aiRecommendations?: AIRecommendationDto[];
}

export class CrossChainTransferDto {
  @ApiProperty({
    description: 'Source chain name',
    example: 'sepolia',
  })
  @IsString()
  fromChain: string;

  @ApiProperty({
    description: 'Destination chain name',
    example: 'baseSepolia',
  })
  @IsString()
  toChain: string;

  @ApiProperty({
    description: 'Transferred amount',
    example: '400000000',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    description: 'CCIP message ID',
    example: '0x123...',
  })
  @IsString()
  messageId: string;

  @ApiProperty({
    description: 'Cross-chain transfer transaction hash',
    example: '0x456...',
  })
  @IsString()
  transactionHash: string;
}

export class MultiChainDepositResponseDto {
  @ApiProperty({
    description: 'All deposit transactions across chains',
    type: [TransactionResponseDto],
  })
  transactions: TransactionResponseDto[];

  @ApiProperty({
    description: 'Cross-chain transfers executed',
    type: [CrossChainTransferDto],
  })
  crossChainTransfers: CrossChainTransferDto[];

  @ApiProperty({
    description: 'Total USD value deposited across all chains',
    example: 1000,
  })
  totalDepositedUSD: number;
}
