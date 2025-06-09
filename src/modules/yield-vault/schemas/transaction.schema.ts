import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  REBALANCE = 'rebalance',
  HARVEST = 'harvest',
  EMERGENCY_WITHDRAW = 'emergency_withdraw',
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REVERTED = 'reverted',
}

@Schema({
  timestamps: true,
  collection: 'transactions',
})
export class Transaction {
  _id: Types.ObjectId;

  @Prop({ required: true })
  userAddress: string; // User wallet address

  @Prop({ required: true })
  chainId: number; // 1, 137, 250, 43114

  @Prop({ required: true, enum: TransactionType })
  type: TransactionType; // deposit, withdraw, rebalance, etc.

  @Prop({ required: true })
  tokenAddress: string; // Token involved

  @Prop({ required: true })
  tokenSymbol: string; // AAVE, WBTC, etc.

  @Prop({ required: true })
  amount: string; // Amount in wei (stored as string for precision)

  @Prop()
  amountUSD?: number; // USD value at time of transaction

  @Prop()
  txHash?: string; // Blockchain transaction hash

  @Prop({
    required: true,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Prop()
  blockNumber?: number;

  @Prop()
  gasUsed?: number;

  @Prop()
  gasPrice?: string; // Gas price in wei

  @Prop({ type: Object })
  protocolData?: {
    fromProtocol?: string; // For rebalancing
    toProtocol?: string;
    fromAllocation?: number;
    toAllocation?: number;
  };

  @Prop({ type: Object })
  shares?: {
    sharesBefore: string; // User shares before transaction
    sharesAfter: string; // User shares after transaction
    sharesDelta: string; // Change in shares
  };

  @Prop({ type: Object })
  error?: {
    message: string;
    code?: string;
    reason?: string;
  };

  @Prop()
  initiatedBy?: string; // 'user' or 'agent' for automated transactions

  @Prop({ type: Object })
  agentData?: {
    agentId?: string;
    reason?: string; // Why the agent initiated this
    confidence?: number; // Agent's confidence in this action
  };

  @Prop()
  timestamp: Date; // When transaction was initiated

  @Prop()
  confirmedAt?: Date; // When transaction was confirmed

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Indexes for efficient querying
TransactionSchema.index({ userAddress: 1, timestamp: -1 });
TransactionSchema.index({ chainId: 1, type: 1, timestamp: -1 });
TransactionSchema.index({ txHash: 1 }, { unique: true, sparse: true });
TransactionSchema.index({ status: 1, timestamp: -1 });
TransactionSchema.index({ tokenAddress: 1, type: 1, timestamp: -1 });
TransactionSchema.index({ initiatedBy: 1, timestamp: -1 });
TransactionSchema.index(
  {
    userAddress: 1,
    chainId: 1,
    tokenAddress: 1,
    timestamp: -1,
  },
  {
    name: 'user_activity_index',
  },
);
