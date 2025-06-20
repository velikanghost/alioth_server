import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExternalAIController } from './controllers/external-ai.controller';
import { ExternalAIService } from './services/external-ai.service';
import {
  UserPortfolio,
  UserPortfolioSchema,
} from '../../shared/schemas/user-portfolio.schema';
import {
  MarketDataCache,
  MarketDataCacheSchema,
} from '../../shared/schemas/market-data-cache.schema';
import { MarketAnalysisModule } from '../market-analysis/market-analysis.module';
import { SwapExecutionModule } from '../swap-execution/swap-execution.module';
import { YieldVaultModule } from '../yield-vault/yield-vault.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPortfolio.name, schema: UserPortfolioSchema },
      { name: MarketDataCache.name, schema: MarketDataCacheSchema },
    ]),
    MarketAnalysisModule,
    SwapExecutionModule,
    YieldVaultModule,
  ],
  controllers: [ExternalAIController],
  providers: [ExternalAIService],
  exports: [ExternalAIService],
})
export class ExternalAIModule {}
