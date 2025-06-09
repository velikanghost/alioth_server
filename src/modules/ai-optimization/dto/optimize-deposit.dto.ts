import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptimizeDepositDto {
  @ApiProperty({
    description: 'Address of the input token to deposit',
    example: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
  })
  @IsString()
  @IsNotEmpty()
  inputToken: string;

  @ApiProperty({
    description: 'Amount of input token to deposit (in wei/smallest unit)',
    example: '1000000000000000000', // 1 DAI
  })
  @IsString()
  @IsNotEmpty()
  inputAmount: string;

  @ApiProperty({
    description: 'User wallet address',
    example: '0x742F35Cc8635C0532C81b1e3a7b5CCc0B14A6e86',
  })
  @IsString()
  @IsNotEmpty()
  userAddress: string;

  @ApiPropertyOptional({
    description:
      'User risk tolerance (1-10, where 1 is conservative and 10 is aggressive)',
    example: 5,
    minimum: 1,
    maximum: 10,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  riskTolerance?: number = 5;

  @ApiPropertyOptional({
    description: 'Maximum acceptable slippage in basis points (100 = 1%)',
    example: 300, // 3%
    minimum: 10,
    maximum: 1000,
    default: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  maxSlippage?: number = 300;

  @ApiPropertyOptional({
    description: 'Minimum expected yield improvement in basis points',
    example: 50, // 0.5%
    minimum: 0,
    maximum: 1000,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  minYieldImprovement?: number = 50;

  @ApiPropertyOptional({
    description: 'Array of preferred tokens for allocation (if any)',
    example: ['0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'], // AAVE
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTokens?: string[];

  @ApiPropertyOptional({
    description: 'Array of tokens to exclude from allocation',
    example: ['0xA0b86a33E6441cA0A3E3f9b41b0A4C7D6b33F3e'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedTokens?: string[];

  @ApiPropertyOptional({
    description: 'Whether to enable auto-rebalancing for this deposit',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoRebalance?: boolean = true;

  @ApiPropertyOptional({
    description: 'Gas price to use for transactions (in wei)',
    example: '20000000000', // 20 gwei
  })
  @IsOptional()
  @IsString()
  gasPrice?: string;

  @ApiPropertyOptional({
    description: 'Maximum gas limit for the operation',
    example: 500000,
    minimum: 100000,
    maximum: 1000000,
    default: 500000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100000)
  @Max(1000000)
  gasLimit?: number = 500000;
}

export class TokenAllocationDto {
  @ApiProperty({
    description: 'Token address',
    example: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Token symbol',
    example: 'AAVE',
  })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({
    description: 'Allocation percentage (0-100)',
    example: 40.5,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({
    description: 'Amount to allocate (in wei)',
    example: '405000000000000000', // 0.405 ETH equivalent
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Expected APY for this token allocation',
    example: 8.5,
  })
  @IsNumber()
  @Min(0)
  expectedAPY: number;

  @ApiProperty({
    description: 'Risk score for this allocation (1-100)',
    example: 35,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  riskScore: number;

  @ApiProperty({
    description: 'Protocol allocations for this token',
    example: { aave: 60, compound: 40 },
  })
  protocolAllocations: Record<string, number>;
}

export class SwapRouteDto {
  @ApiProperty({
    description: 'Input token address',
    example: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  })
  @IsString()
  @IsNotEmpty()
  inputToken: string;

  @ApiProperty({
    description: 'Output token address',
    example: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  })
  @IsString()
  @IsNotEmpty()
  outputToken: string;

  @ApiProperty({
    description: 'Input amount (in wei)',
    example: '1000000000000000000',
  })
  @IsString()
  @IsNotEmpty()
  inputAmount: string;

  @ApiProperty({
    description: 'Expected output amount (in wei)',
    example: '950000000000000000',
  })
  @IsString()
  @IsNotEmpty()
  expectedOutput: string;

  @ApiProperty({
    description: 'DEX aggregator to use',
    example: '1inch',
  })
  @IsString()
  @IsNotEmpty()
  aggregator: string;

  @ApiProperty({
    description: 'Swap route data',
    example: '0x...',
  })
  @IsString()
  routeData: string;

  @ApiProperty({
    description: 'Estimated gas cost',
    example: 150000,
  })
  @IsNumber()
  gasEstimate: number;

  @ApiProperty({
    description: 'Price impact percentage',
    example: 0.25,
  })
  @IsNumber()
  priceImpact: number;
}

export class OptimizationStrategyDto {
  @ApiProperty({
    description: 'Unique operation ID',
    example: 'opt_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  operationId: string;

  @ApiProperty({
    description: 'User address',
    example: '0x742F35Cc8635C0532C81b1e3a7b5CCc0B14A6e86',
  })
  @IsString()
  @IsNotEmpty()
  userAddress: string;

  @ApiProperty({
    description: 'Input token details',
  })
  @ValidateNested()
  @Type(() => OptimizeDepositDto)
  inputDetails: OptimizeDepositDto;

  @ApiProperty({
    description: 'Recommended token allocations',
    type: [TokenAllocationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenAllocationDto)
  tokenAllocations: TokenAllocationDto[];

  @ApiProperty({
    description: 'Required swap routes',
    type: [SwapRouteDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SwapRouteDto)
  swapRoutes: SwapRouteDto[];

  @ApiProperty({
    description: 'Overall expected APY',
    example: 12.8,
  })
  @IsNumber()
  @Min(0)
  expectedAPY: number;

  @ApiProperty({
    description: 'Portfolio risk score (1-100)',
    example: 42,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  riskScore: number;

  @ApiProperty({
    description: 'Diversification score (1-100)',
    example: 78,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  diversificationScore: number;

  @ApiProperty({
    description: 'Total estimated gas cost in USD',
    example: 25.5,
  })
  @IsNumber()
  @Min(0)
  estimatedGasCostUSD: number;

  @ApiProperty({
    description: 'AI confidence in this strategy (1-100)',
    example: 85,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  confidence: number;

  @ApiProperty({
    description: 'Strategy reasoning from AI',
    example:
      'Optimal allocation based on current yield opportunities and risk profile',
  })
  @IsString()
  reasoning: string;

  @ApiPropertyOptional({
    description: 'Expiration timestamp for this strategy',
    example: 1640995200000,
  })
  @IsOptional()
  @IsNumber()
  expiresAt?: number;
}
