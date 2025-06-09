import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserVaultDocument = UserVault & Document;

export interface VaultBalance {
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  shares: string; // User shares in wei
  estimatedValue: number; // USD value
  yieldEarned: number; // Total yield earned USD
  depositedAmount: string; // Original deposit amount in wei
  depositedValueUSD: number; // Original deposit USD value
  lastUpdated: Date;
}

export enum RiskProfile {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
}

@Schema({
  timestamps: true,
  collection: 'user_vaults',
})
export class UserVault {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  userAddress: string; // Wallet address (from auth)

  @Prop({ type: [Object], default: [] })
  vaultBalances: VaultBalance[]; // All user's vault positions

  @Prop({ required: true, default: 0 })
  totalValueLocked: number; // Total USD across all positions

  @Prop({ required: true, default: 0 })
  totalYieldEarned: number; // Lifetime yield in USD

  @Prop({ required: true, enum: RiskProfile, default: RiskProfile.MODERATE })
  riskProfile: RiskProfile; // User's risk preference

  @Prop({ type: Object })
  preferences?: {
    autoRebalance: boolean;
    maxSlippage: number; // Percentage
    rebalanceThreshold: number; // APY difference threshold
    emergencyPause: boolean;
    notifications: {
      rebalance: boolean;
      harvest: boolean;
      emergencies: boolean;
    };
  };

  @Prop({ type: Object })
  agentSettings?: {
    enabledAgents: string[]; // List of agent IDs
    agentRiskTolerance: number; // 1-10 scale
    maxAutomaticAllocation: number; // Max % agent can allocate
    requireConfirmation: boolean; // Whether to ask user before actions
  };

  @Prop({ type: Object })
  statistics?: {
    totalTransactions: number;
    totalDeposits: number;
    totalWithdrawals: number;
    averageAPY: number;
    bestPerformingToken: string;
    totalRebalances: number;
    lastActivityAt: Date;
  };

  @Prop({ type: Object })
  chainPreferences?: {
    [chainId: string]: {
      enabled: boolean;
      maxAllocation: number; // Max % to allocate to this chain
      preferredProtocols: string[]; // Preferred protocols on this chain
    };
  };

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserVaultSchema = SchemaFactory.createForClass(UserVault);

// Indexes for efficient querying
UserVaultSchema.index({ userAddress: 1 }, { unique: true });
UserVaultSchema.index({ totalValueLocked: -1 });
UserVaultSchema.index({ totalYieldEarned: -1 });
UserVaultSchema.index({ riskProfile: 1 });
UserVaultSchema.index({ 'vaultBalances.chainId': 1 });
UserVaultSchema.index({ 'vaultBalances.tokenSymbol': 1 });
UserVaultSchema.index({ 'statistics.lastActivityAt': -1 });
