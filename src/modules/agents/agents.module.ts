import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { YieldMonitoringAgent } from './services/yield-monitoring.agent';
import { ElizaYieldAgent } from './services/eliza-yield.agent';
import { YieldVaultModule } from '../yield-vault/yield-vault.module';
import { Web3Module } from '../../shared/web3/web3.module';

@Module({
  imports: [YieldVaultModule, Web3Module],
  providers: [YieldMonitoringAgent, ElizaYieldAgent],
  exports: [YieldMonitoringAgent, ElizaYieldAgent],
})
export class AgentsModule {}
