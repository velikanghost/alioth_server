import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type APRSnapshotDocument = APRSnapshot & Document;

@Schema({
  timestamps: true,
  collection: 'apr_snapshots',
})
export class APRSnapshot {
  _id: Types.ObjectId;

  @Prop({ required: true })
  chainId: number; // 1, 137, 250, 43114

  @Prop({ required: true })
  protocolName: string; // 'aave', 'compound', 'curve', 'yearn'

  @Prop({ required: true })
  tokenAddress: string; // Token address

  @Prop({ required: true })
  tokenSymbol: string; // AAVE, WBTC, USDT, etc.

  @Prop({ required: true })
  supplyAPR: number; // Supply APR percentage

  @Prop()
  rewardAPR?: number; // Additional reward APR (incentives)

  @Prop({ required: true })
  totalAPY: number; // Combined APY including compound frequency

  @Prop({ required: true })
  totalValueLocked: number; // TVL in the protocol for this token

  @Prop({ required: true })
  utilizationRate: number; // Protocol utilization percentage

  @Prop({ type: Object })
  additionalMetrics?: {
    borrowAPR?: number;
    liquidityIndex?: number;
    reserveFactor?: number;
    supplyCap?: number;
    borrowCap?: number;
  };

  @Prop({ type: Object })
  protocolData?: {
    contractAddress?: string;
    poolAddress?: string;
    aTokenAddress?: string;
    variableDebtTokenAddress?: string;
  };

  @Prop({ type: Object })
  riskMetrics?: {
    protocolRiskScore: number; // 1-10 scale
    liquidityRisk: number;
    smartContractRisk: number;
    volatilityScore: number;
  };

  @Prop({ required: true })
  timestamp: Date; // When this snapshot was taken

  @Prop({ required: true })
  blockNumber: number; // Block number for accuracy

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const APRSnapshotSchema = SchemaFactory.createForClass(APRSnapshot);

// Indexes for efficient querying and time-series analysis
APRSnapshotSchema.index({
  chainId: 1,
  protocolName: 1,
  tokenAddress: 1,
  timestamp: -1,
});
APRSnapshotSchema.index({ tokenSymbol: 1, timestamp: -1 });
APRSnapshotSchema.index({ totalAPY: -1, timestamp: -1 });
APRSnapshotSchema.index({ protocolName: 1, totalAPY: -1 });
APRSnapshotSchema.index({ timestamp: -1 }); // For time-based queries
APRSnapshotSchema.index(
  {
    chainId: 1,
    tokenAddress: 1,
    timestamp: -1,
  },
  {
    name: 'time_series_index',
  },
);
