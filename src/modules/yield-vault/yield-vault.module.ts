import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaultController } from './controllers/vault.controller';
import { AliothWalletController } from './controllers/alioth-wallet.controller';
import { VaultService } from './services/vault.service';
import { VaultDepositService } from './services/vault-deposit.service';
import { VaultWithdrawalService } from './services/vault-withdrawal.service';
import { VaultPortfolioService } from './services/vault-portfolio.service';
import { VaultTokenService } from './services/vault-token.service';
import { VaultTransactionService } from './services/vault-transaction.service';
import { AliothWalletService } from './services/alioth-wallet.service';
import { APRTrackingService } from './services/apr-tracking.service';
import { UserVault, UserVaultSchema } from './schemas/user-vault.schema';
import { Vault, VaultSchema } from './schemas/vault.schema';
import {
  AliothWallet,
  AliothWalletSchema,
} from './schemas/alioth-wallet.schema';
import { APRSnapshot, APRSnapshotSchema } from './schemas/apr-snapshot.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Web3Module } from '../../shared/web3/web3.module';
import { PrivyModule } from '../../shared/privy/privy.module';
import { MarketAnalysisModule } from '../market-analysis/market-analysis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserVault.name, schema: UserVaultSchema },
      { name: Vault.name, schema: VaultSchema },
      { name: AliothWallet.name, schema: AliothWalletSchema },
      { name: APRSnapshot.name, schema: APRSnapshotSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    Web3Module,
    PrivyModule,
    MarketAnalysisModule,
  ],
  controllers: [VaultController, AliothWalletController],
  providers: [
    VaultService,
    VaultDepositService,
    VaultWithdrawalService,
    VaultPortfolioService,
    VaultTokenService,
    VaultTransactionService,
    AliothWalletService,
    APRTrackingService,
  ],
  exports: [
    VaultService,
    VaultDepositService,
    VaultWithdrawalService,
    VaultPortfolioService,
    VaultTokenService,
    VaultTransactionService,
    AliothWalletService,
    APRTrackingService,
  ],
})
export class YieldVaultModule {}
