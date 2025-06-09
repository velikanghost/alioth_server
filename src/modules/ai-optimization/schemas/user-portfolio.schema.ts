import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserPortfolioDocument = UserPortfolio & Document;

@Schema()
export class TokenPosition {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  shares: string; // BigInt as string

  @Prop({ required: true })
  amount: string; // BigInt as string - alias for shares

  @Prop({ required: true })
  currentValue: string; // BigInt as string

  @Prop({ required: true })
  currentValueUSD: number;

  @Prop({ required: true })
  depositedAmount: string; // BigInt as string

  @Prop({ required: true })
  currentAPY: number;

  @Prop({ required: true })
  lastUpdateTime: Date;

  @Prop({ type: Object, default: {} })
  protocolAllocations: Record<string, number>; // protocol -> percentage
}

@Schema()
export class ProtocolPosition {
  @Prop({ required: true })
  protocol: string;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  amount: string; // BigInt as string

  @Prop({ required: true })
  amountUSD: number;

  @Prop({ required: true })
  apy: number;

  @Prop({ required: true })
  lastUpdateTime: Date;
}

@Schema()
export class PerformanceMetrics {
  @Prop({ required: true })
  totalReturn: number; // Percentage

  @Prop({ required: true })
  annualizedReturn: number; // Percentage

  @Prop({ required: true })
  volatility: number; // Standard deviation

  @Prop({ required: true })
  sharpeRatio: number;

  @Prop({ required: true })
  maxDrawdown: number; // Percentage

  @Prop({ required: true })
  totalFeesUSD: number;

  @Prop({ required: true })
  totalYieldEarnedUSD: number;

  @Prop({ required: true })
  lastCalculatedAt: Date;
}

@Schema({ timestamps: true })
export class UserPortfolio {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userAddress: string;

  @Prop({ required: true })
  totalValueUSD: number;

  @Prop({ required: true })
  totalValue: number; // Alias for totalValueUSD for backward compatibility

  @Prop({ required: true })
  totalDepositedUSD: number;

  @Prop({ type: [TokenPosition], default: [] })
  tokenPositions: TokenPosition[];

  @Prop({ type: [TokenPosition], default: [] })
  positions: TokenPosition[]; // Alias for tokenPositions for backward compatibility

  @Prop({ type: [ProtocolPosition], default: [] })
  protocolPositions: ProtocolPosition[];

  @Prop({ required: true })
  currentAPY: number; // Weighted average APY

  @Prop({ required: true })
  riskScore: number; // 1-100 scale

  @Prop({ required: true })
  diversificationScore: number; // 1-100 scale

  @Prop({ type: PerformanceMetrics })
  performance: PerformanceMetrics;

  @Prop({ default: 0 })
  performance24h: number; // 24h performance percentage

  @Prop({ default: Date.now })
  lastRebalanceTime: Date;

  @Prop()
  aiStrategy: string; // Current AI strategy being used

  @Prop({ type: Object, default: {} })
  customSettings: Record<string, any>; // User preferences

  @Prop({ default: true })
  autoRebalanceEnabled: boolean;

  @Prop({ default: 5 }) // 5% default risk tolerance
  riskTolerance: number;
}

export const UserPortfolioSchema = SchemaFactory.createForClass(UserPortfolio);

// Create indexes for better query performance
UserPortfolioSchema.index({ userId: 1, userAddress: 1 }, { unique: true });
UserPortfolioSchema.index({ totalValueUSD: -1 }); // For leaderboards
UserPortfolioSchema.index({ lastRebalanceTime: 1 }); // For rebalancing jobs
