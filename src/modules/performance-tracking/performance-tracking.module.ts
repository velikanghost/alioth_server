import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PerformanceTrackingService } from './services/performance-tracking.service';
import { SharedModule } from 'src/shared/shared.module';
import {
  UserPortfolio,
  UserPortfolioSchema,
} from '../ai-optimization/schemas/user-portfolio.schema';
import {
  AIDecisionLog,
  AIDecisionLogSchema,
} from '../ai-optimization/schemas/ai-decision-log.schema';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    MongooseModule.forFeature([
      { name: UserPortfolio.name, schema: UserPortfolioSchema },
      { name: AIDecisionLog.name, schema: AIDecisionLogSchema },
    ]),
  ],
  providers: [PerformanceTrackingService],
  exports: [PerformanceTrackingService],
})
export class PerformanceTrackingModule {}
