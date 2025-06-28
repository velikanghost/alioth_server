import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Web3Service } from './web3.service';
import { PrivyModule } from '../privy/privy.module';
import { CCIPService } from './ccip.service';

@Module({
  imports: [ConfigModule, forwardRef(() => PrivyModule)],
  providers: [Web3Service, CCIPService],
  exports: [Web3Service, CCIPService],
})
export class Web3Module {}
