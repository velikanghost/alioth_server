import { ApiProperty } from '@nestjs/swagger';

export class MarketAnalysisDto {
  @ApiProperty({
    description: 'Array of token addresses analyzed',
    example: [
      '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
      '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    ],
  })
  tokens: string[];

  @ApiProperty({
    description: 'Current USD prices for each token',
    example: ['14070000000', '1000000000000000000'], // $140.70 AAVE, $1.00 DAI (with decimals)
  })
  pricesUSD: string[];

  @ApiProperty({
    description: 'Expected yield percentages for each token',
    example: ['850', '1200'], // 8.5% AAVE, 12% DAI (in basis points)
  })
  expectedYields: string[];

  @ApiProperty({
    description: 'Volatility scores for each token (1-100)',
    example: ['45', '15'], // AAVE more volatile than DAI
  })
  volatilityScores: string[];

  @ApiProperty({
    description: 'Risk scores for each token (1-100)',
    example: ['35', '10'], // AAVE higher risk than DAI
  })
  riskScores: string[];

  @ApiProperty({
    description: 'Correlation matrix between tokens',
    example: [
      [1.0, 0.3],
      [0.3, 1.0],
    ], // AAVE-DAI correlation of 0.3
  })
  correlationMatrix: number[][];

  @ApiProperty({
    description: 'Timestamp of the analysis',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Data freshness percentage (0-100)',
    example: 95,
  })
  dataFreshness: number;
}
