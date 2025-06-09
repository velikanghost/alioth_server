import { ApiProperty } from '@nestjs/swagger';

export class PortfolioPerformanceDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user123',
  })
  userId: string;

  @ApiProperty({
    description: 'Performance timeframe',
    example: '30d',
  })
  timeframe: string;

  @ApiProperty({
    description: 'Current portfolio value in USD',
    example: 10500.75,
  })
  currentValue: number;

  @ApiProperty({
    description: 'Total return percentage',
    example: 12.5,
  })
  totalReturn: number;

  @ApiProperty({
    description: 'Annualized return percentage',
    example: 15.2,
  })
  annualizedReturn: number;

  @ApiProperty({
    description: 'Portfolio volatility (standard deviation)',
    example: 18.7,
  })
  volatility: number;

  @ApiProperty({
    description: 'Sharpe ratio (risk-adjusted return)',
    example: 0.81,
  })
  sharpeRatio: number;

  @ApiProperty({
    description: 'Maximum drawdown percentage',
    example: -8.3,
  })
  maxDrawdown: number;

  @ApiProperty({
    description: 'Win rate (percentage of profitable periods)',
    example: 65.5,
  })
  winRate: number;

  @ApiProperty({
    description: 'Profit factor (gross profit / gross loss)',
    example: 1.45,
  })
  profitFactor: number;

  @ApiProperty({
    description: 'Benchmark comparison metrics',
    example: {
      benchmark: 'DeFi Pulse Index',
      outperformance: 3.2,
      relativeSharpe: 1.15,
      correlation: 0.75,
    },
  })
  benchmarkComparison: {
    benchmark: string;
    outperformance: number;
    relativeSharpe: number;
    correlation: number;
  };

  @ApiProperty({
    description: 'AI decision accuracy metrics',
    example: {
      totalDecisions: 25,
      accurateDecisions: 20,
      accuracyRate: 0.8,
      averageConfidence: 78.5,
    },
  })
  aiDecisionMetrics: {
    totalDecisions: number;
    accurateDecisions: number;
    accuracyRate: number;
    averageConfidence: number;
  };

  @ApiProperty({
    description: 'Risk metrics',
    example: {
      volatility: 18.7,
      valueAtRisk: -5.2,
      conditionalVaR: -8.1,
      beta: 1.15,
      alpha: 0.02,
      informationRatio: 0.5,
    },
  })
  riskMetrics: {
    volatility: number;
    valueAtRisk: number;
    conditionalVaR: number;
    beta: number;
    alpha: number;
    informationRatio: number;
  };

  @ApiProperty({
    description: 'Performance attribution',
    example: {
      assetAllocation: 0.03,
      securitySelection: 0.02,
      timing: 0.01,
      interaction: 0.005,
    },
  })
  attribution: {
    assetAllocation: number;
    securitySelection: number;
    timing: number;
    interaction: number;
  };

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  lastUpdated: Date;
}
