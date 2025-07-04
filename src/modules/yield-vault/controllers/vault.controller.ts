import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VaultService } from '../services/vault.service';
import { APRTrackingService } from '../services/apr-tracking.service';
import {
  DepositDto,
  WithdrawDto,
  ApproveDto,
  UserPreferencesDto,
  UserVaultResponseDto,
  APRHistoryDto,
  APRSnapshotResponseDto,
  VaultPerformanceResponseDto,
  TransactionResponseDto,
  MultiChainDepositDto,
  MultiChainDepositResponseDto,
  AIRecommendationDto,
} from '../dto/vault.dto';
import { ApiResponseDto } from '../../../common/dto/response.dto';

@ApiTags('yield-vault')
@Controller('yield-vault')
@ApiBearerAuth()
export class VaultController {
  private readonly logger = new Logger(VaultController.name);

  constructor(
    private readonly vaultService: VaultService,
    private readonly aprTrackingService: APRTrackingService,
  ) {}

  @Post('deposit')
  @ApiOperation({
    summary: 'Deposit tokens into yield vault',
    description:
      'Deposit tokens into the yield optimization vault for automatic yield farming. Supports multi-chain deposits with AI recommendations.',
  })
  @ApiResponse({
    status: 201,
    description: 'Deposit successful',
    type: ApiResponseDto<TransactionResponseDto | MultiChainDepositResponseDto>,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deposit(
    @Body() depositDto: MultiChainDepositDto,
  ): Promise<
    ApiResponseDto<TransactionResponseDto | MultiChainDepositResponseDto>
  > {
    this.logger.log(`Deposit request: ${JSON.stringify(depositDto)}`);

    try {
      const result = await this.vaultService.deposit(
        depositDto.userAddress,
        depositDto,
        depositDto.aiRecommendations,
      );

      // Handle multi-chain deposit response
      if ('transactions' in result) {
        const multiChainResult = result as any;
        return ApiResponseDto.success(
          {
            transactions: multiChainResult.transactions.map((tx: any) => ({
              id: tx._id.toString(),
              userAddress: tx.userAddress,
              chainId: tx.chainId,
              type: tx.type,
              tokenAddress: tx.tokenAddress,
              tokenSymbol: tx.tokenSymbol,
              amount: tx.amount,
              amountUSD: tx.amountUSD || 0,
              txHash: tx.txHash || '',
              status: tx.status,
              timestamp: tx.timestamp,
              confirmedAt: tx.confirmedAt || new Date(),
              gasUsed: tx.gasUsed || 0,
              shares: tx.shares || {
                sharesBefore: '0',
                sharesAfter: '0',
                sharesDelta: '0',
              },
            })),
            crossChainTransfers: multiChainResult.crossChainTransfers,
            totalDepositedUSD: multiChainResult.totalDepositedUSD,
          },
          'Multi-chain deposit completed successfully',
        );
      }

      // Handle single-chain deposit response
      const transaction = result as any;
      return ApiResponseDto.success(
        {
          id: transaction._id.toString(),
          userAddress: transaction.userAddress,
          chainId: transaction.chainId,
          type: transaction.type,
          tokenAddress: transaction.tokenAddress,
          tokenSymbol: transaction.tokenSymbol,
          amount: transaction.amount,
          amountUSD: transaction.amountUSD || 0,
          txHash: transaction.txHash || '',
          status: transaction.status,
          timestamp: transaction.timestamp,
          confirmedAt: transaction.confirmedAt || new Date(),
          gasUsed: transaction.gasUsed || 0,
          shares: transaction.shares || {
            sharesBefore: '0',
            sharesAfter: '0',
            sharesDelta: '0',
          },
        },
        'Deposit initiated successfully',
      );
    } catch (error) {
      this.logger.error('Deposit failed:', error);
      return ApiResponseDto.error(error.message, 'Deposit failed');
    }
  }

  @Post('approve')
  @ApiOperation({
    summary: 'Approve token for vault spending',
    description:
      'Approve the vault contract to spend tokens on behalf of the user',
  })
  @ApiResponse({
    status: 201,
    description: 'Token approval successful',
    type: ApiResponseDto<{ txHash: string }>,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async approve(
    @Body() approveDto: ApproveDto,
  ): Promise<ApiResponseDto<{ txHash: string }>> {
    this.logger.log(`Approve request: ${JSON.stringify(approveDto)}`);

    try {
      const txHash = await this.vaultService.approveToken(
        approveDto.userAddress,
        approveDto.aliothWalletId,
        approveDto.tokenAddress,
        approveDto.amount,
        approveDto.chainId,
      );

      return ApiResponseDto.success(
        { txHash },
        'Token approval initiated successfully',
      );
    } catch (error) {
      this.logger.error('Token approval failed:', error);
      return ApiResponseDto.error(error.message, 'Token approval failed');
    }
  }

  @Post('withdraw')
  @ApiOperation({
    summary: 'Withdraw tokens from yield vault',
    description: 'Withdraw tokens from the yield optimization vault',
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal successful',
    type: ApiResponseDto<TransactionResponseDto>,
  })
  async withdraw(
    @Body() withdrawDto: WithdrawDto,
  ): Promise<ApiResponseDto<TransactionResponseDto>> {
    this.logger.log(`Withdrawal request: ${JSON.stringify(withdrawDto)}`);

    try {
      const transaction = await this.vaultService.withdraw(
        withdrawDto.userAddress,
        withdrawDto,
      );

      return ApiResponseDto.success(
        {
          id: transaction._id.toString(),
          userAddress: transaction.userAddress,
          chainId: transaction.chainId,
          type: transaction.type,
          tokenAddress: transaction.tokenAddress,
          tokenSymbol: transaction.tokenSymbol,
          amount: transaction.amount,
          amountUSD: transaction.amountUSD || 0,
          txHash: transaction.txHash || '',
          status: transaction.status,
          timestamp: transaction.timestamp,
          confirmedAt: transaction.confirmedAt || new Date(),
          gasUsed: transaction.gasUsed || 0,
          shares: transaction.shares || {
            sharesBefore: '0',
            sharesAfter: '0',
            sharesDelta: '0',
          },
        },
        'Withdrawal initiated successfully',
      );
    } catch (error) {
      this.logger.error('Withdrawal failed:', error);
      return ApiResponseDto.error(error.message, 'Withdrawal failed');
    }
  }

  @Post('sync/:address')
  @ApiOperation({
    summary: 'Sync database with contract state',
    description:
      'Manually sync user vault database with actual smart contract state',
  })
  @ApiParam({ name: 'address', description: 'User wallet address' })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Chain ID (default: 11155111 for Sepolia)',
  })
  @ApiResponse({
    status: 200,
    description: 'Database synced with contract state',
    type: ApiResponseDto<UserVaultResponseDto>,
  })
  async syncUserVault(
    @Param('address') address: string,
    @Query('chainId') chainId?: string,
  ): Promise<ApiResponseDto<UserVaultResponseDto>> {
    try {
      const chainIdNum = chainId ? parseInt(chainId) : 11155111;

      this.logger.log(`Syncing vault for ${address} on chain ${chainIdNum}`);

      const syncedVault = await this.vaultService.syncUserVaultWithContract(
        address,
        chainIdNum,
      );

      return ApiResponseDto.success(
        {
          userAddress: syncedVault.userAddress,
          source: 'synced_from_contract',
          vaultBalances: syncedVault.vaultBalances.map((balance: any) => ({
            ...balance,
            currentAPY: 4.5, // Mock APY
          })),
          totalValueLocked: syncedVault.totalValueLocked,
          totalYieldEarned: syncedVault.totalYieldEarned,
          riskProfile: syncedVault.riskProfile,
          statistics: syncedVault.statistics || {
            totalTransactions: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            averageAPY: 0,
            bestPerformingToken: '',
            totalRebalances: 0,
            lastActivityAt: new Date(),
          },
        },
        'Database successfully synced with smart contract state',
      );
    } catch (error) {
      this.logger.error('Failed to sync user vault:', error);
      return ApiResponseDto.error(
        error.message,
        'Failed to sync user vault with contract state',
      );
    }
  }

  @Get('balance/:address')
  @ApiOperation({
    summary: 'Get user vault balance',
    description: "Get user's vault balances across all chains and tokens",
  })
  @ApiParam({ name: 'address', description: 'User wallet address' })
  @ApiQuery({
    name: 'source',
    required: false,
    description: 'Data source: "database" (default) or "contract"',
    enum: ['database', 'contract'],
  })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Chain ID (required when source=contract)',
  })
  @ApiResponse({
    status: 200,
    description: 'User vault balance retrieved',
    type: ApiResponseDto<UserVaultResponseDto | any>,
  })
  async getUserBalance(
    @Param('address') address: string,
    @Query('source') source: 'database' | 'contract' = 'database',
    @Query('chainId') chainId?: string,
  ): Promise<ApiResponseDto<UserVaultResponseDto | any>> {
    try {
      if (source === 'contract') {
        // Read directly from smart contract
        const chainIdNum = chainId ? parseInt(chainId) : 11155111; // Default to Sepolia
        const contractData =
          await this.vaultService.getUserPortfolioFromContract(
            address,
            chainIdNum,
          );

        return ApiResponseDto.success(
          {
            userAddress: address,
            chainId: chainIdNum,
            source: 'contract',
            data: {
              tokens: contractData.tokens,
              receiptTokens: contractData.receiptTokens,
              shares: contractData.shares,
              values: contractData.values,
              symbols: contractData.symbols,
              apys: contractData.apys,
            },
            timestamp: new Date(),
          },
          'User vault balance retrieved from smart contract',
        );
      } else {
        // Read from database (existing functionality)
        const userVault = await this.vaultService.getUserVault(address);

        return ApiResponseDto.success(
          {
            userAddress: userVault.userAddress,
            source: 'database',
            vaultBalances: userVault.vaultBalances.map((balance: any) => ({
              ...balance,
              currentAPY: 4.5, // Mock APY - would be calculated from current vault performance
            })),
            totalValueLocked: userVault.totalValueLocked,
            totalYieldEarned: userVault.totalYieldEarned,
            riskProfile: userVault.riskProfile,
            statistics: userVault.statistics || {
              totalTransactions: 0,
              totalDeposits: 0,
              totalWithdrawals: 0,
              averageAPY: 0,
              bestPerformingToken: '',
              totalRebalances: 0,
              lastActivityAt: new Date(),
            },
          },
          'User vault balance retrieved from database',
        );
      }
    } catch (error) {
      this.logger.error('Failed to get user balance:', error);
      return ApiResponseDto.error(
        error.message,
        'Failed to retrieve user balance',
      );
    }
  }

  @Get('balance-contract/:address')
  @ApiOperation({
    summary: 'Get user vault balance from smart contract',
    description:
      "Get user's vault balances directly from the smart contract (real-time data)",
  })
  @ApiParam({ name: 'address', description: 'User wallet address' })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Chain ID (default: 11155111 for Sepolia)',
  })
  @ApiResponse({
    status: 200,
    description: 'User vault balance retrieved from contract',
    type: ApiResponseDto<any>,
  })
  async getUserBalanceFromContract(
    @Param('address') address: string,
    @Query('chainId') chainId?: string,
  ): Promise<ApiResponseDto<any>> {
    try {
      const chainIdNum = chainId ? parseInt(chainId) : 11155111; // Default to Sepolia
      const contractData = await this.vaultService.getUserPortfolioFromContract(
        address,
        chainIdNum,
      );

      // Transform the data into a more user-friendly format
      const portfolioSummary = {
        userAddress: address,
        chainId: chainIdNum,
        source: 'smart_contract',
        timestamp: new Date(),
        positions: contractData.tokens.map((token, index) => ({
          tokenAddress: token,
          receiptTokenAddress: contractData.receiptTokens[index],
          tokenSymbol: contractData.symbols[index],
          shares: contractData.shares[index],
          estimatedValue: contractData.values[index],
          currentAPY: contractData.apys[index],
        })),
        summary: {
          totalPositions: contractData.tokens.length,
          totalShares: contractData.shares.reduce((sum, shares) => {
            return (BigInt(sum) + BigInt(shares || '0')).toString();
          }, '0'),
          totalEstimatedValue: contractData.values.reduce((sum, value) => {
            return (BigInt(sum) + BigInt(value || '0')).toString();
          }, '0'),
        },
      };

      return ApiResponseDto.success(
        portfolioSummary,
        'User vault balance retrieved from smart contract',
      );
    } catch (error) {
      this.logger.error('Failed to get user balance from contract:', error);
      return ApiResponseDto.error(
        error.message,
        'Failed to retrieve user balance from contract',
      );
    }
  }

  @Get('apr-history')
  @ApiOperation({
    summary: 'Get APR history',
    description: 'Get historical APR data across protocols and tokens',
  })
  @ApiQuery({
    name: 'tokenAddress',
    required: false,
    description: 'Filter by token address',
  })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Filter by chain ID',
  })
  @ApiQuery({
    name: 'protocolName',
    required: false,
    description: 'Filter by protocol name',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: 'Hours to look back (default: 24)',
  })
  @ApiResponse({
    status: 200,
    description: 'APR history retrieved',
    type: ApiResponseDto<APRSnapshotResponseDto[]>,
  })
  async getAPRHistory(
    @Query() query: APRHistoryDto,
  ): Promise<ApiResponseDto<APRSnapshotResponseDto[]>> {
    try {
      const snapshots = await this.aprTrackingService.getAPRHistory(
        query.tokenAddress,
        query.chainId,
        query.protocolName,
        query.hours || 24,
      );

      const response = snapshots.map((snapshot) => ({
        chainId: snapshot.chainId,
        protocolName: snapshot.protocolName,
        tokenAddress: snapshot.tokenAddress,
        tokenSymbol: snapshot.tokenSymbol,
        supplyAPR: snapshot.supplyAPR,
        totalAPY: snapshot.totalAPY,
        totalValueLocked: snapshot.totalValueLocked,
        utilizationRate: snapshot.utilizationRate,
        timestamp: snapshot.timestamp,
        riskMetrics: snapshot.riskMetrics || {
          protocolRiskScore: 0,
          liquidityRisk: 0,
          smartContractRisk: 0,
          volatilityScore: 0,
        },
      }));

      return ApiResponseDto.success(
        response,
        'APR history retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Failed to get APR history:', error);
      return ApiResponseDto.error(
        error.message,
        'Failed to retrieve APR history',
      );
    }
  }

  @Get('performance')
  @ApiOperation({
    summary: 'Get vault performance',
    description: 'Get overall vault performance metrics and statistics',
  })
  @ApiQuery({
    name: 'tokenAddress',
    required: false,
    description: 'Filter by token address',
  })
  @ApiQuery({
    name: 'chainId',
    required: false,
    description: 'Filter by chain ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Vault performance retrieved',
    type: ApiResponseDto<VaultPerformanceResponseDto[]>,
  })
  async getVaultPerformance(
    @Query('tokenAddress') tokenAddress?: string,
    @Query('chainId') chainId?: number,
  ): Promise<ApiResponseDto<VaultPerformanceResponseDto[]>> {
    try {
      // Mock performance data
      const performance = [
        {
          tokenAddress: '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a',
          tokenSymbol: 'AAVE',
          chainId: 11155111,
          totalValueLocked: 1250000,
          currentAPR: 4.8,
          performance: {
            totalYieldGenerated: 25000,
            averageAPY: 4.2,
            bestAPY: 6.8,
            rebalanceCount: 12,
          },
          activeStrategies: [
            {
              protocolName: 'aave',
              allocation: 100,
              tvl: 1250000,
              apy: 4.8,
              lastUpdated: new Date(),
            },
          ],
          lastRebalanceAt: new Date(Date.now() - 86400000), // 1 day ago
          nextRebalanceAt: new Date(Date.now() + 3600000), // 1 hour from now
        },
      ];

      const filteredPerformance = performance.filter((p) => {
        if (tokenAddress && p.tokenAddress !== tokenAddress) return false;
        if (chainId && p.chainId !== chainId) return false;
        return true;
      });

      return ApiResponseDto.success(
        filteredPerformance,
        'Vault performance retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Failed to get vault performance:', error);
      return ApiResponseDto.error(
        error.message,
        'Failed to retrieve vault performance',
      );
    }
  }

  @Get('transactions/:address')
  @ApiOperation({
    summary: 'Get user transactions',
    description: "Get user's transaction history",
  })
  @ApiParam({ name: 'address', description: 'User wallet address' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of transactions to return (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved',
    type: ApiResponseDto<TransactionResponseDto[]>,
  })
  async getUserTransactions(
    @Param('address') address: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseDto<TransactionResponseDto[]>> {
    try {
      const transactions = await this.vaultService.getUserTransactions(
        address,
        limit ? parseInt(limit) : 50,
      );

      const response = transactions.map((tx) => ({
        id: tx._id.toString(),
        userAddress: tx.userAddress,
        chainId: tx.chainId,
        type: tx.type,
        tokenAddress: tx.tokenAddress,
        tokenSymbol: tx.tokenSymbol,
        amount: tx.amount,
        amountUSD: tx.amountUSD || 0,
        txHash: tx.txHash || '',
        status: tx.status,
        timestamp: tx.timestamp,
        confirmedAt: tx.confirmedAt || new Date(),
        gasUsed: tx.gasUsed || 0,
        shares: tx.shares || {
          sharesBefore: '0',
          sharesAfter: '0',
          sharesDelta: '0',
        },
      }));

      return ApiResponseDto.success(
        response,
        'Transactions retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Failed to get transactions:', error);
      return ApiResponseDto.error(
        error.message,
        'Failed to retrieve transactions',
      );
    }
  }

  @Patch('preferences')
  @ApiOperation({
    summary: 'Update user preferences',
    description: 'Update user vault preferences and risk settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    type: ApiResponseDto<UserVaultResponseDto>,
  })
  async updatePreferences(
    @Request() req: any,
    @Body() preferences: UserPreferencesDto,
  ): Promise<ApiResponseDto<UserVaultResponseDto>> {
    try {
      const userAddress =
        req.user?.walletAddress || '0x28738040d191ff30673f546FB6BF997E6cdA6dbF';

      const userVault = await this.vaultService.updateUserPreferences(
        userAddress,
        preferences,
      );

      return ApiResponseDto.success(
        {
          userAddress: userVault.userAddress,
          vaultBalances: userVault.vaultBalances.map((balance: any) => ({
            ...balance,
            currentAPY: 4.5,
          })),
          totalValueLocked: userVault.totalValueLocked,
          totalYieldEarned: userVault.totalYieldEarned,
          riskProfile: userVault.riskProfile,
          statistics: userVault.statistics || {
            totalTransactions: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            averageAPY: 0,
            bestPerformingToken: '',
            totalRebalances: 0,
            lastActivityAt: new Date(),
          },
        },
        'User preferences updated successfully',
      );
    } catch (error) {
      this.logger.error('Failed to update preferences:', error);
      return ApiResponseDto.error(
        error.message,
        'Failed to update preferences',
      );
    }
  }
}
