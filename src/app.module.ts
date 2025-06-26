import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DatabaseModule } from './shared/database/database.module';
import { RedisModule } from './shared/redis/redis.module';
import { Web3Module } from './shared/web3/web3.module';
import { SharedModule } from './shared/shared.module';
import { YieldVaultModule } from './modules/yield-vault/yield-vault.module';
import { MarketAnalysisModule } from './modules/market-analysis/market-analysis.module';
import { PerformanceTrackingModule } from './modules/performance-tracking/performance-tracking.module';
import { AIOptimizationModule } from './modules/ai-optimization/ai-optimization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: 60000, // 1 minute
            limit: 10,
          },
        ],
      }),
    }),

    DatabaseModule,
    RedisModule,
    Web3Module,
    SharedModule,
    YieldVaultModule,
    AIOptimizationModule,
    MarketAnalysisModule,
    PerformanceTrackingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
