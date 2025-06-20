import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserPortfolioDocument = UserPortfolio & Document;

@Schema({ timestamps: true })
export class UserPortfolio {
  @Prop({ required: true, unique: true })
  userAddress: string;

  @Prop({ required: true })
  chainId: number;

  @Prop({
    type: Map,
    of: {
      balance: { type: String, required: true },
      usdValue: { type: Number, required: true },
      protocol: { type: String, required: true },
      apy: { type: Number, required: true },
      lastUpdated: { type: Date, required: true },
    },
    default: {},
  })
  positions: Map<string, any>;

  @Prop({ type: Number, default: 0 })
  totalValueUSD: number;

  @Prop({ type: Number, default: 0 })
  totalYieldEarned: number;

  @Prop({ type: Number, default: 0 })
  weightedAPY: number;

  @Prop({ type: Date, default: Date.now })
  lastRebalance: Date;

  @Prop({ type: Number, min: 1, max: 10, default: 5 })
  riskTolerance: number;

  @Prop({
    type: {
      enabled: { type: Boolean, default: false },
      minYieldDifference: { type: Number, default: 0.5 },
      maxGasCostUSD: { type: Number, default: 50 },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly',
      },
    },
    default: {},
  })
  autoRebalanceSettings: any;

  @Prop({
    type: [
      {
        timestamp: { type: Date, required: true },
        fromAllocation: { type: Map, of: Number, required: true },
        toAllocation: { type: Map, of: Number, required: true },
        gasUsed: { type: String, required: true },
        gasCostUSD: { type: Number, required: true },
        yieldImprovementPercent: { type: Number, required: true },
        executedBy: { type: String, enum: ['user', 'auto'], required: true },
      },
    ],
    default: [],
  })
  rebalanceHistory: any[];

  @Prop({
    type: {
      totalDeposited: { type: Number, default: 0 },
      totalWithdrawn: { type: Number, default: 0 },
      totalYieldEarned: { type: Number, default: 0 },
      totalGasPaid: { type: Number, default: 0 },
      netReturn: { type: Number, default: 0 },
      netReturnPercent: { type: Number, default: 0 },
    },
    default: {},
  })
  performanceMetrics: any;

  @Prop({ type: Date, default: Date.now })
  lastActivityTimestamp: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const UserPortfolioSchema = SchemaFactory.createForClass(UserPortfolio);

// Create indexes for better performance
UserPortfolioSchema.index({ userAddress: 1, chainId: 1 }, { unique: true });
UserPortfolioSchema.index({ totalValueUSD: -1 });
UserPortfolioSchema.index({ lastActivityTimestamp: -1 });
UserPortfolioSchema.index({ isActive: 1 });
