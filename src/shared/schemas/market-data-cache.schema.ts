import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketDataCacheDocument = MarketDataCache & Document;

@Schema({ timestamps: true })
export class MarketDataCache {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Object, required: true })
  data: any;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: false })
  expiresAt?: Date;

  @Prop({ required: true })
  tokenAddress: string;

  @Prop({ required: true })
  chainId: number;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    type: {
      usd: { type: Number, required: true },
      eth: { type: Number, required: true },
      timestamp: { type: Date, required: true },
      source: { type: String, required: true },
    },
    required: true,
  })
  price: {
    usd: number;
    eth: number;
    timestamp: Date;
    source: string;
  };

  @Prop({
    type: [
      {
        protocol: { type: String, required: true },
        apy: { type: Number, required: true },
        tvl: { type: Number, required: true },
        riskScore: { type: Number, min: 1, max: 10, required: true },
        lastUpdated: { type: Date, required: true },
      },
    ],
    default: [],
  })
  yields: Array<{
    protocol: string;
    apy: number;
    tvl: number;
    riskScore: number;
    lastUpdated: Date;
  }>;

  @Prop({
    type: {
      daily: { type: Number, default: 0 },
      weekly: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 },
      lastCalculated: { type: Date, default: Date.now },
    },
    default: {},
  })
  volatility: {
    daily: number;
    weekly: number;
    monthly: number;
    lastCalculated: Date;
  };

  @Prop({ type: Number, min: 1, max: 10, default: 5 })
  riskScore: number;

  @Prop({
    type: [
      {
        token: { type: String, required: true },
        correlation: { type: Number, min: -1, max: 1, required: true },
        timeframe: { type: String, enum: ['7d', '30d', '90d'], required: true },
        lastCalculated: { type: Date, required: true },
      },
    ],
    default: [],
  })
  correlations: Array<{
    token: string;
    correlation: number;
    timeframe: string;
    lastCalculated: Date;
  }>;

  @Prop({
    type: {
      volume24h: { type: Number, default: 0 },
      marketCap: { type: Number, default: 0 },
      fullyDilutedValuation: { type: Number, default: 0 },
      circulatingSupply: { type: Number, default: 0 },
      totalSupply: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    default: {},
  })
  marketMetrics: {
    volume24h: number;
    marketCap: number;
    fullyDilutedValuation: number;
    circulatingSupply: number;
    totalSupply: number;
    lastUpdated: Date;
  };

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;

  @Prop({ type: Number, default: 300 }) // 5 minutes default
  cacheValiditySeconds: number;

  @Prop({ type: Boolean, default: true })
  isValid: boolean;

  @Prop({ type: String, required: true })
  dataSource: string;
}

export const MarketDataCacheSchema =
  SchemaFactory.createForClass(MarketDataCache);

// Create indexes for better performance and querying
MarketDataCacheSchema.index({ key: 1 }, { unique: true });
MarketDataCacheSchema.index({ tokenAddress: 1, chainId: 1 });
MarketDataCacheSchema.index({ symbol: 1 });
MarketDataCacheSchema.index({ timestamp: -1 });
MarketDataCacheSchema.index({ lastUpdated: -1 });
MarketDataCacheSchema.index({ isValid: 1 });
MarketDataCacheSchema.index({ 'yields.apy': -1 });
MarketDataCacheSchema.index({ riskScore: 1 });

// TTL index to automatically remove expired cache entries
MarketDataCacheSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0, // Expire based on expiresAt field
  },
);

// Fallback TTL index
MarketDataCacheSchema.index(
  { lastUpdated: 1 },
  {
    expireAfterSeconds: 3600, // 1 hour
  },
);
