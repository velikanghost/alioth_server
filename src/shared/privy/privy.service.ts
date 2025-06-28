import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
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
    @Inject(forwardRef(() => Web3Service))
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

      const wallet = await this.privy.walletApi.create({
        chainType: 'ethereum',
      });

      const aliothWallet: UserAliothWallet = {
        userId: `alioth_wallet_${userAddress}`,
        userAddress,
        privyWalletId: wallet.id,
        aliothWalletAddress: wallet.address,
        chainType: 'ethereum',
        chainId: 0,
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
   * Sign a message with the user's Alioth wallet
   */
  async signMessage(privyWalletId: string, message: string): Promise<string> {
    try {
      this.logger.log(`Signing message with wallet ${privyWalletId}`);

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

      if (!walletAddress || !walletAddress.startsWith('0x')) {
        throw new Error(`Invalid wallet address format: ${walletAddress}`);
      }

      const validatedAddress = walletAddress as `0x${string}`;

      const chainName = this.getChainNameFromChainId(chainId || 11155111);

      if (
        !tokenAddress ||
        tokenAddress === 'native' ||
        tokenAddress === 'ETH'
      ) {
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
        // Fetch ERC-20 balance using viem
        const erc20Abi = [
          {
            type: 'function',
            name: 'balanceOf',
            stateMutability: 'view',
            inputs: [{ name: 'owner', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
          {
            type: 'function',
            name: 'decimals',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'uint8' }],
          },
          {
            type: 'function',
            name: 'symbol',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'string' }],
          },
        ];

        const tokenContract = this.web3Service.createContract(
          chainName,
          tokenAddress as `0x${string}`,
          erc20Abi,
        );

        try {
          const rawBal = (await tokenContract.read.balanceOf([
            validatedAddress,
          ])) as bigint;

          let decimals = 18;
          try {
            decimals = Number(await tokenContract.read.decimals([]));
          } catch (_) {
            this.logger.warn(
              `decimals() not found on token ${tokenAddress}, defaulting to 6`,
            );
            decimals = 6;
          }

          let symbol = 'TOKEN';
          try {
            symbol = String(await tokenContract.read.symbol([]));
          } catch (_) {
            // ignore
          }

          const formatted = (Number(rawBal) / 10 ** decimals).toString();

          return {
            balance: rawBal.toString(),
            raw: rawBal.toString(),
            formatted,
            tokenAddress,
            symbol,
          };
        } catch (tokenErr) {
          this.logger.warn(
            `Unable to fetch token balance for ${tokenAddress} on ${chainName}: ${tokenErr.message}`,
          );
          return {
            balance: '0',
            raw: '0',
            formatted: '0.0',
            tokenAddress,
            symbol: 'TOKEN',
          };
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to get balance for wallet ${walletAddress}:`,
        error,
      );
      throw error;
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

      return await this.executeTransfer(
        privyWalletId,
        userAddress,
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
   * Execute transfer from Alioth wallet to any address
   */
  async executeTransfer(
    privyWalletId: string,
    toAddress: string,
    tokenAddress: string,
    amount: string,
    chainId: number,
    data?: `0x${string}`,
  ): Promise<string> {
    try {
      this.logger.log(
        `Transferring ${amount} of ${tokenAddress} from Alioth wallet to ${toAddress}`,
      );

      const caip2 = `eip155:${chainId}` as const;

      if (tokenAddress === 'native' || tokenAddress === 'ETH') {
        const txRequest: any = {
          to: toAddress as `0x${string}`,
          value: `0x${BigInt(amount).toString(16)}`,
          chainId,
        };

        if (data) {
          txRequest.data = data;
        }

        const result = await this.privy.walletApi.ethereum.sendTransaction({
          walletId: privyWalletId,
          caip2,
          transaction: txRequest,
        });

        this.logger.log(`💸 Native transfer executed: ${result.hash}`);
        return result.hash;
      } else {
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
   * Execute a vault deposit transaction using the Alioth wallet
   */
  async executeVaultDeposit(
    privyWalletId: string,
    vaultAddress: string,
    tokenAddress: string,
    amount: string,
    minShares: string,
    chainId: number,
    targetProtocol: string = 'aave', // Default to aave if not specified
  ): Promise<string> {
    try {
      this.logger.log(
        `Executing vault deposit: ${amount} of ${tokenAddress} to vault ${vaultAddress} with wallet ${privyWalletId} targeting protocol ${targetProtocol}`,
      );

      // Convert chainId to CAIP-2 format - ensure proper type
      const caip2 = `eip155:${chainId}` as const;

      // Encode vault deposit function call with new signature including targetProtocol
      const depositData = encodeFunctionData({
        abi: [
          {
            type: 'function',
            name: 'deposit',
            inputs: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint256' },
              { name: 'minShares', type: 'uint256' },
              { name: 'targetProtocol', type: 'string' },
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
          targetProtocol,
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
    targetProtocol: string = 'aave', // Default to aave if not specified
  ): Promise<string> {
    try {
      this.logger.log(
        `Executing vault withdrawal: ${shares} shares of ${tokenAddress} from vault ${vaultAddress} with wallet ${privyWalletId} targeting protocol ${targetProtocol}`,
      );

      // Convert chainId to CAIP-2 format - ensure proper type
      const caip2 = `eip155:${chainId}` as const;

      // Encode vault withdrawal function call with updated signature including targetProtocol
      const withdrawData = encodeFunctionData({
        abi: [
          {
            type: 'function',
            name: 'withdraw',
            inputs: [
              { name: 'token', type: 'address' },
              { name: 'shares', type: 'uint256' },
              { name: 'minAmount', type: 'uint256' },
              { name: 'targetProtocol', type: 'string' },
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
          targetProtocol,
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
      let ownerAddress = walletAddress;
      if (!ownerAddress || !ownerAddress.startsWith('0x')) {
        try {
          const wallet = await this.privy.walletApi.getWallet({
            id: privyWalletId,
          });
          ownerAddress = wallet.address;
        } catch (fetchErr) {
          this.logger.warn(
            `Unable to fetch wallet address for ${privyWalletId}: ${fetchErr.message}`,
          );
          throw new Error(
            'Unable to determine owner wallet address for allowance check',
          );
        }
      }

      this.logger.log(
        `Checking token approval: ${tokenAddress} for spender ${spenderAddress}`,
      );

      const chainName = this.getChainNameFromChainId(chainId);

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
        ownerAddress as `0x${string}`,
        spenderAddress as `0x${string}`,
      ])) as bigint;

      this.logger.log(
        `Current allowance: ${currentAllowance.toString()}, Required: ${amount}`,
      );

      if (currentAllowance < BigInt(amount)) {
        this.logger.log(
          `Insufficient allowance, executing approval transaction`,
        );

        const caip2 = `eip155:${chainId}` as const;

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
}
