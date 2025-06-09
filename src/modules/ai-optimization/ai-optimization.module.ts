import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AIYieldOptimizationService } from './services/ai-yield-optimization.service';
import { AIOptimizationController } from './controllers/ai-optimization.controller';
import {
  UserPortfolio,
  UserPortfolioSchema,
} from './schemas/user-portfolio.schema';
import { ChainlinkDataService } from '../market-analysis/services/chainlink-data.service';
import { DEXAggregatorService } from '../swap-execution/services/dex-aggregator.service';

import { PerformanceTrackingService } from '../performance-tracking/services/performance-tracking.service';

import { MarketAnalysisModule } from '../market-analysis/market-analysis.module';
import { SwapExecutionModule } from '../swap-execution/swap-execution.module';
import { PerformanceTrackingModule } from '../performance-tracking/performance-tracking.module';
import { SharedModule } from 'src/shared/shared.module';
import {
  AIDecisionLog,
  AIDecisionLogSchema,
} from './schemas/ai-decision-log.schema';
import {
  MarketDataCache,
  MarketDataCacheSchema,
} from './schemas/market-data-cache.schema';
import { AIAuthorizationService } from './services/ai-authorization.service';
import { CrossTokenAllocationEngine } from './services/cross-token-allocation-engine.service';
import { RealtimeMonitoringService } from './services/realtime-monitoring.service';
import { Web3ContractService } from './services/web3-contract.service';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    MarketAnalysisModule,
    SwapExecutionModule,
    PerformanceTrackingModule,
    MongooseModule.forFeature([
      { name: UserPortfolio.name, schema: UserPortfolioSchema },
      { name: AIDecisionLog.name, schema: AIDecisionLogSchema },
      { name: MarketDataCache.name, schema: MarketDataCacheSchema },
    ]),
  ],
  controllers: [AIOptimizationController],
  providers: [
    AIYieldOptimizationService,
    CrossTokenAllocationEngine,
    Web3ContractService,
    AIAuthorizationService,
    RealtimeMonitoringService,
  ],
  exports: [
    AIYieldOptimizationService,
    CrossTokenAllocationEngine,
    Web3ContractService,
    AIAuthorizationService,
  ],
})
export class AIOptimizationModule {}
