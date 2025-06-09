import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketDataCacheDocument = MarketDataCache & Document;

@Schema()
export class PriceData {
  @Prop({ required: true })
  priceUSD: number;

  @Prop({ required: true })
  source: string; // 'CHAINLINK' | 'DEX' | 'COINGECKO'

  @Prop({ required: true })
  confidence: number; // 0-100 confidence score

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  roundId?: string; // Chainlink round ID

  @Prop()
  isStale: boolean;
}

@Schema()
export class YieldData {
  @Prop({ required: true })
  protocol: string;

  @Prop({ required: true })
  apy: number;

  @Prop({ required: true })
  tvl: number; // Total Value Locked in USD

  @Prop({ required: true })
  utilization: number; // Utilization rate 0-100

  @Prop({ required: true })
  liquidityDepth: number; // Available liquidity in USD

  @Prop()
  borrowApy?: number; // For lending protocols

  @Prop()
  supplyApy?: number; // For lending protocols

  @Prop({ required: true })
  lastUpdateTime: Date;

  @Prop({ default: false })
  isActive: boolean; // Is the protocol currently accepting deposits
}

@Schema()
export class VolatilityData {
  @Prop({ required: true })
  dailyVolatility: number; // Daily volatility percentage

  @Prop({ required: true })
  weeklyVolatility: number; // Weekly volatility percentage

  @Prop({ required: true })
  monthlyVolatility: number; // Monthly volatility percentage

  @Prop({ type: Object, required: true })
  correlationMatrix: Record<string, number>; // Correlation with other tokens

  @Prop({ required: true })
  beta: number; // Beta relative to market

  @Prop({ required: true })
  varValue: number; // Value at Risk

  @Prop({ required: true })
  lastCalculatedAt: Date;
}

@Schema()
export class LiquidityData {
  @Prop({ required: true })
  totalLiquidity: number; // Total liquidity in USD

  @Prop({ type: Object, required: true })
  liquidityByDex: Record<string, number>; // DEX name -> liquidity USD

  @Prop({ type: Object, required: true })
  averageSlippage: Record<string, number>; // Amount -> expected slippage %

  @Prop({ type: Object, required: true })
  priceImpact: Record<string, number>; // Amount -> price impact %

  @Prop({ required: true })
  lastUpdateTime: Date;
}

@Schema({ timestamps: true })
export class MarketDataCache {
  @Prop({ required: true })
  key: string; // Cache key

  @Prop({ required: true })
  token: string; // Token address

  @Prop({ required: true })
  symbol: string; // Token symbol (e.g., AAVE, USDC)

  @Prop({ required: true })
  name: string; // Token name

  @Prop({ required: true })
  decimals: number;

  @Prop({ type: Object, required: true })
  data: any; // Cached data object

  @Prop({ required: true, default: Date.now })
  timestamp: Date; // When the data was cached

  @Prop({ type: PriceData, required: true })
  priceData: PriceData;

  @Prop({ type: [YieldData], default: [] })
  yieldData: YieldData[]; // Multiple protocols for this token

  @Prop({ type: VolatilityData })
  volatilityData?: VolatilityData;

  @Prop({ type: LiquidityData })
  liquidityData?: LiquidityData;

  @Prop({ required: true })
  currentAPY: number; // Weighted average APY across protocols

  @Prop({ required: true })
  bestAPY: number; // Highest APY available

  @Prop({ required: true })
  bestProtocol: string; // Protocol with highest APY

  @Prop({ required: true })
  riskScore: number; // 1-100 risk assessment

  @Prop({ required: true })
  liquidityRank: number; // Liquidity ranking vs other tokens

  @Prop({ type: Object, default: {} })
  protocolAPYs: Record<string, number>; // protocol -> APY

  @Prop({ type: Object, default: {} })
  protocolTVLs: Record<string, number>; // protocol -> TVL in USD

  @Prop({ type: Object, default: {} })
  chainlinkFeeds: Record<string, string>; // feed type -> feed address

  @Prop({ required: true, default: Date.now })
  lastFullUpdate: Date;

  @Prop({ required: true, default: Date.now })
  lastPriceUpdate: Date;

  @Prop({ required: true, default: Date.now })
  lastYieldUpdate: Date;

  @Prop({ default: false })
  isSupported: boolean; // Is token supported by our system

  @Prop({ default: true })
  isActive: boolean; // Is token currently tradeable

  @Prop({ default: Date.now }) // 5 minutes TTL
  expiresAt: Date;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>; // Additional token metadata
}

export const MarketDataCacheSchema =
  SchemaFactory.createForClass(MarketDataCache);

// Create indexes for efficient querying
MarketDataCacheSchema.index({ token: 1 }, { unique: true });
MarketDataCacheSchema.index({ key: 1 });
MarketDataCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
MarketDataCacheSchema.index({ symbol: 1 });
MarketDataCacheSchema.index({ currentAPY: -1 }); // For yield ranking
MarketDataCacheSchema.index({ bestAPY: -1 }); // For best opportunities
MarketDataCacheSchema.index({ riskScore: 1 }); // For risk filtering
MarketDataCacheSchema.index({ liquidityRank: 1 }); // For liquidity filtering
MarketDataCacheSchema.index({ isSupported: 1, isActive: 1 }); // For supported tokens
MarketDataCacheSchema.index({ lastFullUpdate: 1 }); // For cache invalidation
MarketDataCacheSchema.index({ 'priceData.timestamp': -1 }); // For price tracking
