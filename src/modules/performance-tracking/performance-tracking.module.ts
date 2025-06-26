import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PerformanceTrackingService } from './services/performance-tracking.service';
import { SharedModule } from 'src/shared/shared.module';
import {
  UserPortfolio,
  UserPortfolioSchema,
} from '../../shared/schemas/user-portfolio.schema';
import {
  MarketDataCache,
  MarketDataCacheSchema,
} from '../../shared/schemas/market-data-cache.schema';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    MongooseModule.forFeature([
      { name: UserPortfolio.name, schema: UserPortfolioSchema },
      { name: MarketDataCache.name, schema: MarketDataCacheSchema },
    ]),
  ],
  providers: [PerformanceTrackingService],
  exports: [PerformanceTrackingService],
})
export class PerformanceTrackingModule {}
