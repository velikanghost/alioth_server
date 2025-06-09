import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VaultDocument = Vault & Document;

export interface StrategyAllocation {
  protocolName: string; // 'aave', 'compound', 'curve'
  allocation: number; // Percentage (0-100)
  tvl: number; // Total value locked in this strategy
  apy: number; // Current APY from this strategy
  lastUpdated: Date;
}

@Schema({
  timestamps: true,
  collection: 'vaults',
})
export class Vault {
  _id: Types.ObjectId;

  @Prop({ required: true })
  chainId: number; // 1, 137, 250, 43114

  @Prop({ required: true })
  tokenAddress: string; // Token being optimized

  @Prop({ required: true })
  tokenSymbol: string; // AAVE, WBTC, USDT, etc.

  @Prop({ required: true, default: 0 })
  totalValueLocked: number; // Total USD value

  @Prop({ required: true, default: 0 })
  currentAPR: number; // Weighted average APR

  @Prop({ type: [Object], default: [] })
  activeStrategies: StrategyAllocation[]; // Current protocol allocations

  @Prop({ type: Object })
  targetAllocation?: {
    [protocolName: string]: number; // Target percentages
  };

  @Prop()
  lastRebalanceAt?: Date;

  @Prop()
  nextRebalanceAt?: Date;

  @Prop({ default: 'active' })
  status: string; // 'active', 'paused', 'emergency'

  @Prop({ type: Object })
  performance?: {
    totalYieldGenerated: number;
    averageAPY: number;
    bestAPY: number;
    rebalanceCount: number;
  };

  @Prop({ type: Object })
  riskMetrics?: {
    riskScore: number; // 1-10 scale
    diversificationScore: number;
    protocolRiskDistribution: { [protocol: string]: number };
  };

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const VaultSchema = SchemaFactory.createForClass(Vault);

// Indexes for efficient querying
VaultSchema.index({ chainId: 1, tokenAddress: 1 }, { unique: true });
VaultSchema.index({ tokenSymbol: 1 });
VaultSchema.index({ currentAPR: -1 });
VaultSchema.index({ totalValueLocked: -1 });
VaultSchema.index({ lastRebalanceAt: -1 });
VaultSchema.index({ 'performance.averageAPY': -1 });
