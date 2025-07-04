import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ChainlinkDataService } from './services/chainlink-data.service';
import { ChainlinkPriceFeedService } from './services/chainlink-price-feed.service';
import { MarketAnalysisController } from './controllers/market-analysis.controller';
import { SharedModule } from 'src/shared/shared.module';
import {
  MarketDataCache,
  MarketDataCacheSchema,
} from '../../shared/schemas/market-data-cache.schema';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    MongooseModule.forFeature([
      { name: MarketDataCache.name, schema: MarketDataCacheSchema },
    ]),
  ],
  controllers: [MarketAnalysisController],
  providers: [ChainlinkDataService, ChainlinkPriceFeedService],
  exports: [ChainlinkDataService, ChainlinkPriceFeedService],
})
export class MarketAnalysisModule {}
