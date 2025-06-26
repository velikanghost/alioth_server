import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { AIOptimizationController } from './controllers/ai-optimization.controller';

// Services
import { AgentCommunicationService } from './services/agent-communication.service';
import { YieldOptimizerService } from './services/yield-optimizer.service';
import { TokenService } from './services/token.service';

// Gateways
// import { OptimizationGateway } from './gateways/optimization.gateway'; // TODO: Implement when needed

// Schemas
import {
  OptimizationExecution,
  OptimizationExecutionSchema,
} from '../../shared/schemas/optimization-execution.schema';
import {
  ChainlinkEvent,
  ChainlinkEventSchema,
} from '../../shared/schemas/chainlink-event.schema';

// Shared modules
import { Web3Module } from '../../shared/web3/web3.module';
import { MarketAnalysisModule } from '../market-analysis/market-analysis.module';
import { YieldVaultModule } from '../yield-vault/yield-vault.module';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    // Configuration
    ConfigModule,

    // HTTP client will be handled by axios in services

    // Database schemas
    MongooseModule.forFeature([
      { name: OptimizationExecution.name, schema: OptimizationExecutionSchema },
      { name: ChainlinkEvent.name, schema: ChainlinkEventSchema },
    ]),

    // Shared modules
    Web3Module,
    SharedModule,

    // External modules for dependencies
    MarketAnalysisModule, // For Chainlink data service
    YieldVaultModule, // For vault deposit and wallet services
  ],

  controllers: [AIOptimizationController],

  providers: [
    AgentCommunicationService,
    YieldOptimizerService,
    TokenService,
    // OptimizationGateway, // TODO: Implement when websocket is implemented
  ],

  exports: [
    AgentCommunicationService,
    YieldOptimizerService,
    TokenService,
    MongooseModule,
  ],
})
export class AIOptimizationModule {
  constructor() {
    console.log('🤖 AI Optimization Module initialized');
  }
}
