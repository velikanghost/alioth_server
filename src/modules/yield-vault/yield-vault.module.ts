import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaultController } from './controllers/vault.controller';
import { AliothWalletController } from './controllers/alioth-wallet.controller';
import { VaultService } from './services/vault.service';
import { AliothWalletService } from './services/alioth-wallet.service';
import { APRTrackingService } from './services/apr-tracking.service';
import { Web3Module } from '../../shared/web3/web3.module';
import { MarketAnalysisModule } from '../market-analysis/market-analysis.module';
import { PrivyModule } from '../../shared/privy/privy.module';

// Schemas
import { UserVault, UserVaultSchema } from './schemas/user-vault.schema';
import { Vault, VaultSchema } from './schemas/vault.schema';
import { APRSnapshot, APRSnapshotSchema } from './schemas/apr-snapshot.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import {
  AliothWallet,
  AliothWalletSchema,
} from './schemas/alioth-wallet.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserVault.name, schema: UserVaultSchema },
      { name: Vault.name, schema: VaultSchema },
      { name: APRSnapshot.name, schema: APRSnapshotSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: AliothWallet.name, schema: AliothWalletSchema },
    ]),
    Web3Module, // For blockchain interactions
    MarketAnalysisModule, // For Chainlink price data
    PrivyModule, // For Alioth wallet management
  ],
  controllers: [VaultController, AliothWalletController],
  providers: [VaultService, AliothWalletService, APRTrackingService],
  exports: [VaultService, AliothWalletService, APRTrackingService], // Export for use in other modules
})
export class YieldVaultModule {}
