import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AliothWalletDocument = AliothWallet & Document;

@Schema({
  timestamps: true,
  collection: 'alioth_wallets',
})
export class AliothWallet {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  userAddress: string; // Main wallet address (from auth)

  @Prop({ required: true, unique: true })
  privyWalletId: string; // Privy's internal wallet ID

  @Prop({ required: true, unique: true })
  aliothWalletAddress: string; // Alioth wallet's blockchain address

  @Prop({ required: true, default: 'multi-chain' })
  chainType: string; // 'multi-chain' for AI/Alioth wallets

  @Prop({ required: true, default: true })
  isActive: boolean; // Whether the wallet is active

  @Prop({ type: Object })
  metadata?: {
    purpose?: string; // Purpose of the wallet
    name?: string; // Custom name
    chainConfigurations?: {
      [chainId: number]: {
        riskLevel: 'conservative' | 'moderate' | 'aggressive';
        maxAllocation: string; // Max amount to allocate on this chain
        isEnabled: boolean;
      };
    };
  };

  @Prop({ type: Object })
  performance?: {
    totalDeposited: string; // Total deposits in wei
    totalWithdrawn: string; // Total withdrawals in wei
    currentBalance: string; // Current balance in wei
    totalYieldEarned: string; // Total yield earned in wei
    totalTransactions: number; // Count of all transactions
    averageAPY: number; // Average APY earned
    lastOptimization?: Date; // Last optimization run
  };

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AliothWalletSchema = SchemaFactory.createForClass(AliothWallet);

// Create indexes for better query performance
AliothWalletSchema.index({ userAddress: 1 });
AliothWalletSchema.index({ privyWalletId: 1 });
AliothWalletSchema.index({ aliothWalletAddress: 1 });
AliothWalletSchema.index({ isActive: 1 });
