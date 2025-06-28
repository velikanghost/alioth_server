import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrivyService } from './privy.service';
import { Web3Module } from '../web3/web3.module';

@Module({
  imports: [ConfigModule, forwardRef(() => Web3Module)],
  providers: [PrivyService],
  exports: [PrivyService],
})
export class PrivyModule {}
