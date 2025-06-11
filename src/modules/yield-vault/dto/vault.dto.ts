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
} from 'class-validator';
import { RiskProfile } from '../schemas/user-vault.schema';

export class DepositDto {
  @ApiProperty({
    description: 'Alioth wallet ID to use for the transaction',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  aliothWalletId: string;

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
}

export class WithdrawDto {
  @ApiProperty({
    description: 'Alioth wallet ID to use for the transaction',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  aliothWalletId: string;

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
}

export class ApproveDto {
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
    description: 'Amount to approve for vault spending (in wei)',
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
}
