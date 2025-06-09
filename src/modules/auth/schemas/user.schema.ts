import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true })
  walletAddress: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  kycData?: {
    status: 'pending' | 'approved' | 'rejected';
    creditScore?: number;
    riskCategory?: string;
    verifiedAt?: Date;
  };

  @Prop({ type: Object })
  preferences?: {
    notifications: {
      email: boolean;
      discord: boolean;
      slack: boolean;
    };
    riskTolerance: 'low' | 'medium' | 'high';
  };

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ walletAddress: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ 'kycData.status': 1 });
UserSchema.index({ createdAt: -1 });
