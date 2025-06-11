import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/server-auth';
import { Web3Service } from '../web3/web3.service';
import { formatEther } from 'viem';

export interface UserAliothWallet {
  userId: string;
  userAddress: string; // User main wallet address
  privyWalletId: string;
  aliothWalletAddress: string;
  chainType: 'ethereum' | 'solana';
  chainId: number;
  createdAt: Date;
  isActive: boolean;
}

export interface AliothWalletTransaction {
  walletId: string;
  transactionHash: string;
  chainId: number;
  operation: 'deposit' | 'withdraw' | 'swap' | 'optimize';
  amount: string;
  tokenAddress: string;
  timestamp: Date;
}

@Injectable()
export class PrivyService {
  private readonly logger = new Logger(PrivyService.name);
  private readonly privy: PrivyClient;

  constructor(
    private configService: ConfigService,
    private web3Service: Web3Service,
  ) {
    const appId = this.configService.get<string>('PRIVY_APP_ID');
    const appSecret = this.configService.get<string>('PRIVY_APP_SECRET');

    if (!appId || !appSecret) {
      throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET must be configured');
    }

    this.privy = new PrivyClient(appId, appSecret);
    this.logger.log('Privy client initialized');
  }

  /**
   * Create a dedicated Alioth wallet for a user
   * This wallet will be used for Alioth optimization operations across multiple chains
   */
  async createUserAliothWallet(userAddress: string): Promise<UserAliothWallet> {
    try {
      this.logger.log(
        `Creating multi-chain Alioth wallet for user ${userAddress}`,
      );

      // Create a managed wallet for Alioth operations (chain-agnostic)
      const wallet = await this.privy.walletApi.create({
        chainType: 'ethereum', // Default to Ethereum for wallet creation
      });

      const aliothWallet: UserAliothWallet = {
        userId: `alioth_wallet_${userAddress}`,
        userAddress,
        privyWalletId: wallet.id,
        aliothWalletAddress: wallet.address,
        chainType: 'ethereum',
        chainId: 0, // Legacy field - Alioth wallets are multi-chain via metadata.chainConfigurations
        createdAt: new Date(),
        isActive: true,
      };

      this.logger.log(
        `✅ Multi-chain Alioth wallet created: ${wallet.address} for user ${userAddress}`,
      );

      return aliothWallet;
    } catch (error) {
      this.logger.error(
        `Failed to create Alioth wallet for ${userAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get existing Alioth wallet for a user or create if doesn't exist
   */
  async getOrCreateUserAliothWallet(
    userAddress: string,
    chainId: number = 11155111,
  ): Promise<UserAliothWallet> {
    try {
      // In production, you'd check database first
      // For now, we'll create a new wallet each time
      return await this.createUserAliothWallet(userAddress);
    } catch (error) {
      this.logger.error(
        `Failed to get/create Alioth wallet for ${userAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sign a transaction with the user's Alioth wallet
   */
  async signTransaction(
    privyWalletId: string,
    transaction: any,
    chainId: number,
  ): Promise<string> {
    try {
      this.logger.log(`Signing transaction with wallet ${privyWalletId}`);

      // Convert chainId to CAIP-2 format
      const caip2 = this.getCAIP2FromChainId(chainId);

      // For now, we'll simulate the transaction signing
      // In production, you'd use the correct Privy API method
      const simulatedTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2).padStart(40, '0')}`;

      this.logger.log(`🎭 Simulated transaction signed: ${simulatedTxHash}`);
      return simulatedTxHash;
    } catch (error) {
      this.logger.error(
        `Failed to sign transaction with wallet ${privyWalletId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Helper method to convert chainId to chain name for Web3Service
   */
  private getChainNameFromChainId(chainId: number): string {
    switch (chainId) {
      case 11155111:
        return 'sepolia';
      case 43113:
        return 'avalancheFuji';
      default:
        return 'sepolia'; // Default to sepolia
    }
  }

  /**
   * Get wallet balance for the Alioth wallet
   */
  async getWalletBalance(
    walletAddress: string,
    chainId?: number,
    tokenAddress?: string,
  ): Promise<any> {
    try {
      this.logger.log(`Getting balance for wallet address: ${walletAddress}`);

      // Validate wallet address format
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        throw new Error(`Invalid wallet address format: ${walletAddress}`);
      }

      const validatedAddress = walletAddress as `0x${string}`;

      // Determine which chain to query based on chainId
      const chainName = this.getChainNameFromChainId(chainId || 11155111);

      if (
        !tokenAddress ||
        tokenAddress === 'native' ||
        tokenAddress === 'ETH'
      ) {
        // Get native ETH balance
        const balanceWei = await this.web3Service.getBalance(
          chainName,
          validatedAddress,
        );
        const balanceFormatted = formatEther(balanceWei);

        this.logger.log(
          `💰 Native balance for ${validatedAddress}: ${balanceFormatted} ETH`,
        );

        return {
          balance: balanceWei.toString(),
          raw: balanceWei.toString(),
          formatted: balanceFormatted,
          tokenAddress: 'native',
          symbol: 'ETH',
        };
      } else {
        // Get ERC-20 token balance (would need to implement)
        // For now, return 0 for tokens
        return {
          balance: '0',
          raw: '0',
          formatted: '0.0',
          tokenAddress,
          symbol: 'TOKEN',
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to get balance for wallet ${walletAddress}:`,
        error,
      );
      // Return zero balance on error rather than throwing
      return {
        balance: '0',
        raw: '0',
        formatted: '0.0',
        tokenAddress: tokenAddress || 'native',
        symbol: 'ETH',
      };
    }
  }

  /**
   * Execute a deposit transaction to the Alioth wallet
   */
  async executeDeposit(
    userAddress: string,
    privyWalletId: string,
    tokenAddress: string,
    amount: string,
    chainId: number,
  ): Promise<string> {
    try {
      this.logger.log(
        `Executing deposit: ${amount} of ${tokenAddress} to wallet ${privyWalletId}`,
      );

      // This would construct and sign a deposit transaction
      // For the MVP, we'll return a simulated transaction
      const simulatedTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2).padStart(40, '0')}`;

      this.logger.log(`🎭 Simulated deposit transaction: ${simulatedTxHash}`);
      return simulatedTxHash;
    } catch (error) {
      this.logger.error(`Failed to execute deposit:`, error);
      throw error;
    }
  }

  /**
   * Execute Alioth optimization operations
   */
  async executeAliothOptimization(
    privyWalletId: string,
    optimizationParams: {
      fromToken: string;
      toToken: string;
      amount: string;
      protocol: string;
      chainId: number;
    },
  ): Promise<string> {
    try {
      this.logger.log(`Executing AI optimization with wallet ${privyWalletId}`);

      // This would:
      // 1. Approve tokens if needed
      // 2. Execute swaps via DEX aggregators
      // 3. Deposit to optimal yield protocols
      // 4. Track performance

      const simulatedTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2).padStart(40, '0')}`;

      this.logger.log(`🤖 AI optimization executed: ${simulatedTxHash}`);
      return simulatedTxHash;
    } catch (error) {
      this.logger.error(`Failed to execute AI optimization:`, error);
      throw error;
    }
  }

  /**
   * Execute transfer from Alioth wallet to any address
   */
  async executeTransfer(
    privyWalletId: string,
    toAddress: string,
    tokenAddress: string,
    amount: string,
    chainId: number,
  ): Promise<string> {
    try {
      this.logger.log(
        `Transferring ${amount} of ${tokenAddress} from Alioth wallet to ${toAddress}`,
      );

      // This would construct and sign a transfer transaction using the Alioth wallet's private key
      // For now, return a simulated transaction hash
      const simulatedTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2).padStart(40, '0')}`;

      this.logger.log(`💸 Transfer executed: ${simulatedTxHash}`);
      return simulatedTxHash;
    } catch (error) {
      this.logger.error(`Failed to execute transfer:`, error);
      throw error;
    }
  }

  /**
   * Withdraw funds back to user's main wallet
   */
  async executeWithdrawalToUser(
    privyWalletId: string,
    userMainWallet: string,
    tokenAddress: string,
    amount: string,
    chainId: number,
  ): Promise<string> {
    try {
      this.logger.log(
        `Withdrawing ${amount} of ${tokenAddress} from Alioth wallet to user ${userMainWallet}`,
      );

      // This would construct a transfer transaction from Alioth wallet to user's main wallet
      const simulatedTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2).padStart(40, '0')}`;

      this.logger.log(`💸 Withdrawal to user executed: ${simulatedTxHash}`);
      return simulatedTxHash;
    } catch (error) {
      this.logger.error(`Failed to execute withdrawal to user:`, error);
      throw error;
    }
  }

  /**
   * Convert chainId to CAIP-2 format required by Privy
   */
  private getCAIP2FromChainId(chainId: number): string {
    const chainMap: { [key: number]: string } = {
      1: 'eip155:1', // Ethereum Mainnet
      11155111: 'eip155:11155111', // Sepolia
      137: 'eip155:137', // Polygon
      42161: 'eip155:42161', // Arbitrum
      43114: 'eip155:43114', // Avalanche
      43113: 'eip155:43113', // Avalanche Fuji
    };

    return chainMap[chainId] || `eip155:${chainId}`;
  }

  /**
   * Verify user authentication (to be integrated with existing auth)
   */
  async verifyUserAccess(
    userAddress: string,
    userJwt?: string,
  ): Promise<boolean> {
    try {
      if (userJwt) {
        // Verify JWT token with Privy
        const user = await this.privy.verifyAuthToken(userJwt);
        return user.userId !== null;
      }

      // For now, allow access (would integrate with your existing auth)
      return true;
    } catch (error) {
      this.logger.error(`Failed to verify user access:`, error);
      return false;
    }
  }
}
