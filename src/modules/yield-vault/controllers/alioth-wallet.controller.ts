import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { AliothWalletService } from '../services/alioth-wallet.service';
import { PrivyService } from '../../../shared/privy/privy.service';
import { ApiResponseDto } from '../../../common/dto/response.dto';

export class CreateAliothWalletDto {
  @ApiPropertyOptional({
    description: 'Purpose of the Alioth wallet',
    example: 'DeFi yield optimization',
  })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({
    description: 'Custom name for the Alioth wallet',
    example: 'My Alioth Trading Wallet',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ChainConfigurationDto {
  @ApiProperty({
    description: 'Chain ID to configure',
    example: 11155111,
  })
  @IsNumber()
  chainId: number;

  @ApiProperty({
    description: 'Risk level for this chain',
    enum: ['conservative', 'moderate', 'aggressive'],
    example: 'moderate',
  })
  @IsEnum(['conservative', 'moderate', 'aggressive'])
  riskLevel: 'conservative' | 'moderate' | 'aggressive';

  @ApiProperty({
    description: 'Maximum allocation amount for this chain',
    example: '1000000000000000000',
  })
  @IsString()
  maxAllocation: string;

  @ApiPropertyOptional({
    description: 'Whether this chain configuration is enabled',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

// Removed AliothDepositDto - users fund Alioth wallet directly by sending tokens to aliothWalletAddress

export class AliothOptimizationDto {
  @ApiProperty({
    description: 'Alioth wallet ID to optimize',
    example: '6848adf11152607101a5fe2b',
  })
  @IsString()
  aliothWalletId: string;

  @ApiProperty({
    description: 'Optimization strategy to use',
    enum: ['yield_farming', 'liquidity_providing', 'cross_chain_arbitrage'],
    example: 'yield_farming',
  })
  @IsEnum(['yield_farming', 'liquidity_providing', 'cross_chain_arbitrage'])
  strategy: 'yield_farming' | 'liquidity_providing' | 'cross_chain_arbitrage';

  @ApiProperty({
    description: 'Array of token addresses to optimize',
    example: ['0x...', '0x...'],
    type: [String],
  })
  @IsString({ each: true })
  tokens: string[];

  @ApiProperty({
    description: 'Chain ID to execute optimization on',
    example: 11155111,
  })
  @IsNumber()
  chainId: number;

  @ApiPropertyOptional({
    description: 'Risk tolerance level (1-10 scale)',
    example: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  riskTolerance?: number;
}

export class AliothTransferDto {
  @ApiProperty({
    description: 'Alioth wallet ID to transfer from',
    example: '6848adf11152607101a5fe2b',
  })
  @IsString()
  aliothWalletId: string;

  @ApiProperty({
    description: 'Recipient address',
    example: '0x742d35Cc6635Cb6C9D1d618d8e5d87a3D19A7AD3',
  })
  @IsString()
  toAddress: string;

  @ApiProperty({
    description: 'Token contract address (use ETH for native token)',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  tokenAddress: string;

  @ApiProperty({
    description: 'Amount to transfer (in wei/smallest unit)',
    example: '1000000000000000000',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    description: 'Chain ID to execute transfer on',
    example: 11155111,
  })
  @IsNumber()
  chainId: number;
}

@ApiTags('alioth-wallet')
@Controller('alioth-wallet')
// @UseGuards(JwtAuthGuard) - TODO: Add JWT auth guard
@ApiBearerAuth()
export class AliothWalletController {
  private readonly logger = new Logger(AliothWalletController.name);

  constructor(
    private readonly aliothWalletService: AliothWalletService,
    private readonly privyService: PrivyService,
  ) {}

  @Post('create')
  @ApiOperation({
    summary: 'Create Alioth wallet for user',
    description:
      'Generate a secure Privy-managed multi-chain wallet for Alioth optimization operations',
  })
  @ApiResponse({
    status: 201,
    description: 'Alioth wallet created successfully',
  })
  async createAliothWallet(
    @Request() req: any,
    @Body() createDto: CreateAliothWalletDto,
  ): Promise<ApiResponseDto<any>> {
    try {
      const userAddress = req.user?.walletAddress || '';

      this.logger.log(
        `Creating multi-chain Alioth wallet for user: ${userAddress}`,
      );

      // Check if user already has an Alioth wallet
      const hasExisting =
        await this.aliothWalletService.hasExistingAliothWallet(userAddress);

      if (hasExisting) {
        this.logger.warn(`User ${userAddress} already has an Alioth wallet`);
        return ApiResponseDto.error(
          'You already have an Alioth wallet. Each address can only create one Alioth wallet.',
          'WALLET_EXISTS',
        );
      }

      // Create Privy wallet
      const privyWallet =
        await this.privyService.createUserAliothWallet(userAddress);

      // Create wallet record in database
      const aliothWallet = await this.aliothWalletService.createAliothWallet({
        userAddress,
        privyWalletId: privyWallet.privyWalletId,
        aliothWalletAddress: privyWallet.aliothWalletAddress,
        chainType: 'multi-chain',
        metadata: {
          purpose: createDto.purpose || 'DeFi yield optimization',
          name: createDto.name || 'Alioth Wallet',
          chainConfigurations: {}, // Will be configured per chain later
        },
      });

      return ApiResponseDto.success(
        {
          id: aliothWallet._id.toString(),
          userAddress: aliothWallet.userAddress,
          aliothWalletAddress: aliothWallet.aliothWalletAddress,
          chainType: aliothWallet.chainType,
          purpose: aliothWallet.metadata?.purpose,
          name: aliothWallet.metadata?.name,
          createdAt: aliothWallet.createdAt,
        },
        'Multi-chain Alioth wallet created successfully',
      );
    } catch (error) {
      this.logger.error('Alioth wallet creation failed:', error);
      return ApiResponseDto.error(
        error.message,
        'Alioth wallet creation failed',
      );
    }
  }

  @Post(':walletId/configure-chain')
  @ApiOperation({
    summary: 'Configure chain-specific settings for Alioth wallet',
    description: 'Set risk level and allocation limits for a specific chain',
  })
  @ApiParam({ name: 'walletId', description: 'Alioth wallet ID' })
  async configureChainSettings(
    @Request() req: any,
    @Param('walletId') walletId: string,
    @Body() configDto: ChainConfigurationDto,
  ): Promise<ApiResponseDto<any>> {
    try {
      const userAddress =
        req.user?.walletAddress || '0x28738040d191ff30673f546FB6BF997E6cdA6dbF';

      this.logger.log(
        `Configuring chain ${configDto.chainId} for wallet ${walletId}`,
      );

      // Verify ownership
      const aliothWallet =
        await this.aliothWalletService.getAliothWalletById(walletId);
      if (aliothWallet.userAddress !== userAddress) {
        throw new Error('Unauthorized: Not your Alioth wallet');
      }

      // Update chain configuration in metadata
      const chainConfigs = aliothWallet.metadata?.chainConfigurations || {};
      chainConfigs[configDto.chainId] = {
        riskLevel: configDto.riskLevel,
        maxAllocation: configDto.maxAllocation,
        isEnabled: configDto.isEnabled ?? true,
      };

      // Save updated metadata
      await this.aliothWalletService.updateWalletMetadata(walletId, {
        ...aliothWallet.metadata,
        chainConfigurations: chainConfigs,
      });

      return ApiResponseDto.success(
        {
          walletId,
          chainId: configDto.chainId,
          configuration: chainConfigs[configDto.chainId],
        },
        `Chain ${configDto.chainId} configured successfully`,
      );
    } catch (error) {
      this.logger.error('Chain configuration failed:', error);
      return ApiResponseDto.error(error.message, 'Chain configuration failed');
    }
  }

  @Get('user/:address')
  @ApiOperation({
    summary: 'Get user Alioth wallets',
    description: 'Retrieve all Alioth wallets for a specific user',
  })
  @ApiParam({ name: 'address', description: 'User wallet address' })
  async getUserAliothWallets(
    @Param('address') address: string,
  ): Promise<ApiResponseDto<any>> {
    try {
      const wallets =
        await this.aliothWalletService.getUserAliothWallets(address);

      const response = wallets.map((wallet) => ({
        id: wallet._id.toString(),
        userAddress: wallet.userAddress,
        aliothWalletAddress: wallet.aliothWalletAddress, // Use actual wallet address
        chainType: wallet.chainType,
        isActive: wallet.isActive,
        metadata: wallet.metadata,
        performance: wallet.performance,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      }));

      return ApiResponseDto.success(
        {
          userAddress: address,
          aliothWalletAddress: wallets[0]?.aliothWalletAddress,
          wallets: response,
          totalWallets: response.length,
        },
        'Alioth wallets retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Failed to get user Alioth wallets:', error);
      return ApiResponseDto.error(
        error.message,
        'Failed to retrieve Alioth wallets',
      );
    }
  }

  @Get(':walletId/balance/:chainId')
  @ApiOperation({
    summary: 'Get Alioth wallet balance on specific chain',
    description: 'Retrieve the current balance of tokens in the Alioth wallet',
  })
  @ApiParam({ name: 'walletId', description: 'Alioth wallet ID' })
  @ApiParam({ name: 'chainId', description: 'Chain ID to check balance on' })
  async getWalletBalance(
    @Request() req: any,
    @Param('walletId') walletId: string,
    @Param('chainId') chainId: string,
  ): Promise<ApiResponseDto<any>> {
    try {
      const userAddress =
        req.user?.walletAddress || '0x28738040d191ff30673f546FB6BF997E6cdA6dbF';

      // Verify ownership
      const aliothWallet =
        await this.aliothWalletService.getAliothWalletById(walletId);
      if (aliothWallet.userAddress !== userAddress) {
        throw new Error('Unauthorized: Not your Alioth wallet');
      }

      // Get balance from blockchain
      const balance = await this.privyService.getWalletBalance(
        aliothWallet.aliothWalletAddress, // Use actual wallet address
        parseInt(chainId),
        'ETH', // For now, just ETH balance
      );

      return ApiResponseDto.success(
        {
          walletId,
          aliothWalletAddress: aliothWallet.aliothWalletAddress,
          chainId: parseInt(chainId),
          balance,
        },
        'Wallet balance retrieved successfully',
      );
    } catch (error) {
      this.logger.error('Failed to get wallet balance:', error);
      return ApiResponseDto.error(
        error.message,
        'Failed to get wallet balance',
      );
    }
  }

  @Post('transfer')
  @ApiOperation({
    summary: 'Transfer funds from Alioth wallet',
    description:
      'Transfer tokens or ETH from Alioth wallet to any address (including back to main wallet)',
  })
  async transferFromAliothWallet(
    @Request() req: any,
    @Body() transferDto: AliothTransferDto,
  ): Promise<ApiResponseDto<any>> {
    try {
      const userAddress =
        req.user?.walletAddress || '0x28738040d191ff30673f546FB6BF997E6cdA6dbF';

      this.logger.log(
        `Transfer from Alioth wallet: ${transferDto.amount} to ${transferDto.toAddress}`,
      );

      // Verify ownership
      const aliothWallet = await this.aliothWalletService.getAliothWalletById(
        transferDto.aliothWalletId,
      );

      if (aliothWallet.userAddress !== userAddress) {
        throw new Error('Unauthorized: Not your Alioth wallet');
      }

      // Execute transfer via Privy
      const txHash = await this.privyService.executeTransfer(
        aliothWallet.privyWalletId,
        transferDto.toAddress,
        transferDto.tokenAddress,
        transferDto.amount,
        transferDto.chainId,
      );

      return ApiResponseDto.success(
        {
          txHash,
          fromAddress: aliothWallet.aliothWalletAddress,
          toAddress: transferDto.toAddress,
          amount: transferDto.amount,
          tokenAddress: transferDto.tokenAddress,
          chainId: transferDto.chainId,
        },
        'Transfer executed successfully',
      );
    } catch (error) {
      this.logger.error('Alioth wallet transfer failed:', error);
      return ApiResponseDto.error(error.message, 'Transfer failed');
    }
  }

  @Post('optimize')
  @ApiOperation({
    summary: 'Execute Alioth optimization',
    description:
      'Run automated yield optimization on the Alioth wallet using specified strategy',
  })
  async executeOptimization(
    @Request() req: any,
    @Body() optimizationDto: AliothOptimizationDto,
  ): Promise<ApiResponseDto<any>> {
    try {
      const userAddress =
        req.user?.walletAddress || '0x28738040d191ff30673f546FB6BF997E6cdA6dbF';

      this.logger.log(
        `Alioth optimization requested for wallet: ${optimizationDto.aliothWalletId}`,
      );

      // Verify ownership
      const aliothWallet = await this.aliothWalletService.getAliothWalletById(
        optimizationDto.aliothWalletId,
      );

      if (aliothWallet.userAddress !== userAddress) {
        throw new Error('Unauthorized: Not your Alioth wallet');
      }

      // TODO: Implement actual optimization logic
      // This would involve:
      // 1. Analyzing current wallet holdings
      // 2. Finding optimal yield opportunities
      // 3. Executing cross-token swaps if needed
      // 4. Depositing into optimal DeFi protocols
      // 5. Monitoring and rebalancing

      // For now, simulate optimization
      const optimizationResult = {
        walletId: optimizationDto.aliothWalletId,
        strategy: optimizationDto.strategy,
        tokens: optimizationDto.tokens,
        chainId: optimizationDto.chainId,
        riskTolerance: optimizationDto.riskTolerance || 5,
        estimatedAPY: '12.5%',
        optimizationScore: 8.7,
        recommendedActions: [
          'Swap 30% USDC to WETH for better yield',
          'Deposit into Aave liquidity pool',
          'Enable auto-rebalancing',
        ],
        simulatedOnly: true,
      };

      // Update wallet performance (in real implementation)
      await this.aliothWalletService.updateWalletPerformance(
        optimizationDto.aliothWalletId,
        {
          operation: 'optimize',
          amount: '0', // No direct amount for optimization
          txHash: `sim_${Date.now()}`, // Simulated transaction
        },
      );

      return ApiResponseDto.success(
        optimizationResult,
        'Alioth optimization completed successfully',
      );
    } catch (error) {
      this.logger.error('Alioth optimization failed:', error);
      return ApiResponseDto.error(error.message, 'Optimization failed');
    }
  }
}
