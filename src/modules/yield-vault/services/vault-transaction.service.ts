import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../schemas/transaction.schema';

@Injectable()
export class VaultTransactionService {
  private readonly logger = new Logger(VaultTransactionService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async getUserTransactions(
    userAddress: string,
    limit: number = 50,
  ): Promise<Transaction[]> {
    return this.transactionModel
      .find({ userAddress })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}
