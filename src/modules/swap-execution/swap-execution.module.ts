import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DEXAggregatorService } from './services/dex-aggregator.service';
import { SharedModule } from 'src/shared/shared.module';
import {
  MarketDataCache,
  MarketDataCacheSchema,
} from '../ai-optimization/schemas/market-data-cache.schema';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    MongooseModule.forFeature([
      { name: MarketDataCache.name, schema: MarketDataCacheSchema },
    ]),
  ],
  providers: [DEXAggregatorService],
  exports: [DEXAggregatorService],
})
export class SwapExecutionModule {}
