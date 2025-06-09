import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaultController } from './controllers/vault.controller';
import { VaultService } from './services/vault.service';
import { APRTrackingService } from './services/apr-tracking.service';
import { Web3Module } from '../../shared/web3/web3.module';

// Schemas
import { UserVault, UserVaultSchema } from './schemas/user-vault.schema';
import { Vault, VaultSchema } from './schemas/vault.schema';
import { APRSnapshot, APRSnapshotSchema } from './schemas/apr-snapshot.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserVault.name, schema: UserVaultSchema },
      { name: Vault.name, schema: VaultSchema },
      { name: APRSnapshot.name, schema: APRSnapshotSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    Web3Module, // For blockchain interactions
  ],
  controllers: [VaultController],
  providers: [VaultService, APRTrackingService],
  exports: [VaultService, APRTrackingService], // Export for use in other modules
})
export class YieldVaultModule {}
