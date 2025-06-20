import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { AIOptimizationController } from './controllers/ai-optimization.controller';

// Services
import { AgentCommunicationService } from './services/agent-communication.service';
import { YieldOptimizerService } from './services/yield-optimizer.service';

// Gateways
// import { OptimizationGateway } from './gateways/optimization.gateway';

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
  ],

  controllers: [AIOptimizationController],

  providers: [
    AgentCommunicationService,
    YieldOptimizerService,
    // OptimizationGateway, // TODO: Add when WebSocket implementation is complete
  ],

  exports: [
    AgentCommunicationService,
    YieldOptimizerService,
    // OptimizationGateway, // TODO: Add when WebSocket implementation is complete
    // Export schemas for other modules that might need them
    MongooseModule,
  ],
})
export class AIOptimizationModule {
  constructor() {
    console.log('🤖 AI Optimization Module initialized');
  }
}
