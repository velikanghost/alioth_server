import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { YieldMonitoringAgent } from './services/yield-monitoring.agent';
import { ElizaYieldAgent } from './services/eliza-yield.agent';
import { AliothAIAgentService } from './services/alioth-ai-agent.service';
import { AIAgentController } from './controllers/ai-agent.controller';
import { AIAgentGateway } from './gateways/ai-agent.gateway';
import { YieldVaultModule } from '../yield-vault/yield-vault.module';
import { MarketAnalysisModule } from '../market-analysis/market-analysis.module';
import { AIOptimizationModule } from '../ai-optimization/ai-optimization.module';
import { PerformanceTrackingModule } from '../performance-tracking/performance-tracking.module';
import { Web3Module } from '../../shared/web3/web3.module';
import {
  UserVault,
  UserVaultSchema,
} from '../yield-vault/schemas/user-vault.schema';
import {
  Transaction,
  TransactionSchema,
} from '../yield-vault/schemas/transaction.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: UserVault.name, schema: UserVaultSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    YieldVaultModule,
    MarketAnalysisModule,
    AIOptimizationModule,
    PerformanceTrackingModule,
    Web3Module,
  ],
  controllers: [AIAgentController],
  providers: [
    YieldMonitoringAgent,
    ElizaYieldAgent,
    AliothAIAgentService,
    AIAgentGateway,
  ],
  exports: [
    YieldMonitoringAgent,
    ElizaYieldAgent,
    AliothAIAgentService,
    AIAgentGateway,
  ],
})
export class AgentsModule {}
