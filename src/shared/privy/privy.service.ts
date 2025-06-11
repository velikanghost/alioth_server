import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/server-auth';
import { Web3Service } from '../web3/web3.service';
import { formatEther, encodeFunctionData } from 'viem';

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

      // Create a managed wallet for Alioth operations
      const wallet = await this.privy.walletApi.create({
        chainType: 'ethereum',
      });

      const aliothWallet: UserAliothWallet = {
        userId: `alioth_wallet_${userAddress}`,
        userAddress,
        privyWalletId: wallet.id,
        aliothWalletAddress: wallet.address, // Store the real Privy wallet address
        chainType: 'ethereum',
        chainId: 0, // Legacy field - Alioth wallets are multi-chain
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
   * Sign a message with the user's Alioth wallet
   */
  async signMessage(privyWalletId: string, message: string): Promise<string> {
    try {
      this.logger.log(`Signing message with wallet ${privyWalletId}`);

      // Use Privy's signMessage method
      const { signature } = await this.privy.walletApi.ethereum.signMessage({
        walletId: privyWalletId,
        message: message,
      });

      this.logger.log(`✅ Message signed successfully`);
      return signature;
    } catch (error) {
      this.logger.error(
        `Failed to sign message with wallet ${privyWalletId}:`,
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
      case 84532:
        return 'baseSepolia';
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
          tokenAddress: tokenAddress || 'native',
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

      // Use the transfer method to execute the deposit
      return await this.executeTransfer(
        privyWalletId,
        userAddress, // Transfer to user's address (or specific contract)
        tokenAddress,
        amount,
        chainId,
      );
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

      // For complex optimization, we'd need to orchestrate multiple transactions:
      // 1. Approve tokens if needed
      // 2. Execute swaps via DEX aggregators
      // 3. Deposit to optimal yield protocols
      // 4. Track performance

      // For now, execute a simple token transfer as the optimization action
      return await this.executeTransfer(
        privyWalletId,
        optimizationParams.protocol, // Transfer to protocol contract
        optimizationParams.fromToken,
        optimizationParams.amount,
        optimizationParams.chainId,
      );
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

      // Convert chainId to CAIP-2 format - ensure proper type
      const caip2 = `eip155:${chainId}` as const;

      if (tokenAddress === 'native' || tokenAddress === 'ETH') {
        // Execute native ETH transfer using Privy
        const result = await this.privy.walletApi.ethereum.sendTransaction({
          walletId: privyWalletId,
          caip2,
          transaction: {
            to: toAddress as `0x${string}`,
            value: `0x${BigInt(amount).toString(16)}`,
            chainId,
          },
        });

        this.logger.log(`💸 ETH transfer executed: ${result.hash}`);
        return result.hash;
      } else {
        // Execute ERC-20 token transfer
        const transferData = encodeFunctionData({
          abi: [
            {
              type: 'function',
              name: 'transfer',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ name: '', type: 'bool' }],
              stateMutability: 'nonpayable',
            },
          ],
          functionName: 'transfer',
          args: [toAddress as `0x${string}`, BigInt(amount)],
        });

        const result = await this.privy.walletApi.ethereum.sendTransaction({
          walletId: privyWalletId,
          caip2,
          transaction: {
            to: tokenAddress as `0x${string}`,
            data: transferData,
            chainId,
          },
        });

        this.logger.log(`💸 Token transfer executed: ${result.hash}`);
        return result.hash;
      }
    } catch (error) {
      this.logger.error(`Failed to execute transfer:`, error);
      throw error;
    }
  }

  /**
   * Execute withdrawal from Alioth wallet back to user's main wallet
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

      // Use the transfer method with user's main wallet as destination
      return await this.executeTransfer(
        privyWalletId,
        userMainWallet,
        tokenAddress,
        amount,
        chainId,
      );
    } catch (error) {
      this.logger.error(`Failed to execute withdrawal to user:`, error);
      throw error;
    }
  }

  /**
   * Convert chainId to CAIP-2 format for Privy
   */
  private getCAIP2FromChainId(chainId: number): string {
    return `eip155:${chainId}`;
  }

  /**
   * Verify user access and generate authorization key if needed
   */
  async verifyUserAccess(
    userAddress: string,
    userJwt?: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`Verifying user access for ${userAddress}`);

      if (userJwt) {
        // In a full implementation, you would use JWT verification
        // For now, we'll just log that JWT was provided
        this.logger.log(`✅ User access verified with JWT`);
        return true;
      }

      // For now, allow access without JWT (development mode)
      this.logger.warn(`⚠️ User access granted without JWT verification`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to verify user access:`, error);
      return false;
    }
  }

  /**
   * Execute a vault deposit transaction using the Alioth wallet
   */
  async executeVaultDeposit(
    privyWalletId: string,
    vaultAddress: string,
    tokenAddress: string,
    amount: string,
    minShares: string,
    chainId: number,
  ): Promise<string> {
    try {
      this.logger.log(
        `Executing vault deposit: ${amount} of ${tokenAddress} to vault ${vaultAddress} with wallet ${privyWalletId}`,
      );

      // Convert chainId to CAIP-2 format - ensure proper type
      const caip2 = `eip155:${chainId}` as const;

      // First ensure token approval if needed
      // TODO: Pass wallet address from the calling method
      // await this.ensureTokenApproval(
      //   privyWalletId,
      //   walletAddress,
      //   tokenAddress,
      //   vaultAddress,
      //   amount,
      //   chainId,
      // );

      // Encode vault deposit function call
      const depositData = encodeFunctionData({
        abi: [
          {
            type: 'function',
            name: 'deposit',
            inputs: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' },
              { name: 'minShares', type: 'uint256' },
            ],
            outputs: [{ name: 'shares', type: 'uint256' }],
            stateMutability: 'nonpayable',
          },
        ],
        functionName: 'deposit',
        args: [
          tokenAddress as `0x${string}`,
          BigInt(amount),
          BigInt(minShares),
        ],
      });

      // Execute the deposit transaction
      const result = await this.privy.walletApi.ethereum.sendTransaction({
        walletId: privyWalletId,
        caip2,
        transaction: {
          to: vaultAddress as `0x${string}`,
          data: depositData,
          chainId,
        },
      });

      this.logger.log(`✅ Vault deposit transaction executed: ${result.hash}`);
      return result.hash;
    } catch (error) {
      this.logger.error(`Failed to execute vault deposit:`, error);
      throw error;
    }
  }

  /**
   * Execute a vault withdrawal transaction using the Alioth wallet
   */
  async executeVaultWithdrawal(
    privyWalletId: string,
    vaultAddress: string,
    tokenAddress: string,
    shares: string,
    minAmount: string,
    chainId: number,
  ): Promise<string> {
    try {
      this.logger.log(
        `Executing vault withdrawal: ${shares} shares of ${tokenAddress} from vault ${vaultAddress} with wallet ${privyWalletId}`,
      );

      // Convert chainId to CAIP-2 format - ensure proper type
      const caip2 = `eip155:${chainId}` as const;

      // Encode vault withdrawal function call
      const withdrawData = encodeFunctionData({
        abi: [
          {
            type: 'function',
            name: 'withdraw',
            inputs: [
              { name: 'token', type: 'address' },
              { name: 'shares', type: 'uint256' },
              { name: 'minAmount', type: 'uint256' },
            ],
            outputs: [{ name: 'amount', type: 'uint256' }],
            stateMutability: 'nonpayable',
          },
        ],
        functionName: 'withdraw',
        args: [
          tokenAddress as `0x${string}`,
          BigInt(shares),
          BigInt(minAmount),
        ],
      });

      // Execute the withdrawal transaction
      const result = await this.privy.walletApi.ethereum.sendTransaction({
        walletId: privyWalletId,
        caip2,
        transaction: {
          to: vaultAddress as `0x${string}`,
          data: withdrawData,
          chainId,
        },
      });

      this.logger.log(
        `✅ Vault withdrawal transaction executed: ${result.hash}`,
      );
      return result.hash;
    } catch (error) {
      this.logger.error(`Failed to execute vault withdrawal:`, error);
      throw error;
    }
  }

  /**
   * Ensure token approval for vault operations
   */
  async ensureTokenApproval(
    privyWalletId: string,
    walletAddress: string,
    tokenAddress: string,
    spenderAddress: string,
    amount: string,
    chainId: number,
  ): Promise<string> {
    try {
      this.logger.log(
        `Checking token approval: ${tokenAddress} for spender ${spenderAddress}`,
      );

      const chainName = this.getChainNameFromChainId(chainId);

      // Use the provided wallet address instead of deriving it

      // Check current allowance using Web3Service
      const tokenContract = this.web3Service.createContract(
        chainName,
        tokenAddress as `0x${string}`,
        [
          {
            type: 'function',
            name: 'allowance',
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' },
            ],
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
          },
        ],
      );

      const currentAllowance = (await tokenContract.read.allowance([
        walletAddress as `0x${string}`,
        spenderAddress as `0x${string}`,
      ])) as bigint;

      this.logger.log(
        `Current allowance: ${currentAllowance.toString()}, Required: ${amount}`,
      );

      // If allowance is insufficient, execute approval transaction
      if (currentAllowance < BigInt(amount)) {
        this.logger.log(
          `Insufficient allowance, executing approval transaction`,
        );

        // Convert chainId to CAIP-2 format - ensure proper type
        const caip2 = `eip155:${chainId}` as const;

        // Encode approval function call
        const approvalData = encodeFunctionData({
          abi: [
            {
              type: 'function',
              name: 'approve',
              inputs: [
                { name: 'spender', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ name: '', type: 'bool' }],
              stateMutability: 'nonpayable',
            },
          ],
          functionName: 'approve',
          args: [spenderAddress as `0x${string}`, BigInt(amount)],
        });

        // Execute approval transaction
        const result = await this.privy.walletApi.ethereum.sendTransaction({
          walletId: privyWalletId,
          caip2,
          transaction: {
            to: tokenAddress as `0x${string}`,
            data: approvalData,
            chainId,
          },
        });

        this.logger.log(
          `✅ Token approval transaction executed: ${result.hash}`,
        );

        // Wait for approval transaction to be mined
        await new Promise((resolve) => setTimeout(resolve, 5000));

        return result.hash;
      } else {
        this.logger.log(`✅ Sufficient allowance already exists`);
        return 'APPROVAL_NOT_NEEDED';
      }
    } catch (error) {
      this.logger.error(`Failed to ensure token approval:`, error);
      throw error;
    }
  }

  /**
   * Get wallet address from Privy wallet ID
   * Note: In production, pass the wallet address directly as a parameter
   * since it's already stored in the database when the wallet is created
   */
  private async getPrivyWalletAddress(privyWalletId: string): Promise<string> {
    try {
      // TODO: Replace this with database lookup or pass address as parameter
      // The wallet address is already stored in AliothWallet.aliothWalletAddress
      throw new Error(
        `getPrivyWalletAddress should be replaced with direct address parameter. ` +
          `The wallet address is already stored when the wallet is created.`,
      );
    } catch (error) {
      this.logger.error(`Failed to get Privy wallet address:`, error);
      throw error;
    }
  }
}
