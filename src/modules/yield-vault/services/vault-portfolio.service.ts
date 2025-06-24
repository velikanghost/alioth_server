import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Address } from 'viem';
import { Web3Service } from '../../../shared/web3/web3.service';
import { AliothWalletService } from './alioth-wallet.service';
import { MULTI_ASSET_VAULT_V2_ABI } from 'src/utils/abi';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VaultPortfolioService {
  private readonly logger = new Logger(VaultPortfolioService.name);
  private readonly aliothVaultAddress: string;

  constructor(
    private web3Service: Web3Service,
    private aliothWalletService: AliothWalletService,
    private configService: ConfigService,
  ) {
    this.aliothVaultAddress = this.configService.get<string>(
      'config.contracts.aliothVault',
      '',
    );
  }

  /**
   * Get user's complete portfolio data directly from MultiVaultV2 contract
   * This provides real-time data including current values and APYs
   */
  async getUserPortfolioFromContract(
    userAddress: string,
    chainId: number = 11155111, // Default to Sepolia
    aliothWalletId?: string,
  ): Promise<{
    tokens: string[];
    receiptTokens: string[];
    shares: string[];
    values: string[];
    symbols: string[];
    apys: string[];
  }> {
    try {
      const chainName = this.getChainName(chainId);
      const contract = this.web3Service.createContract(
        chainName,
        this.aliothVaultAddress as Address,
        MULTI_ASSET_VAULT_V2_ABI,
      );

      let addressToQuery = userAddress;

      // If aliothWalletId is provided, get the Alioth wallet address
      if (aliothWalletId) {
        try {
          const aliothWallet = await this.getUserAliothWallet(
            userAddress,
            aliothWalletId,
          );
          addressToQuery = aliothWallet.aliothWalletAddress;
          this.logger.log(
            `📊 Using Alioth wallet address ${addressToQuery} for portfolio query (user: ${userAddress})`,
          );
        } catch (aliothError) {
          this.logger.warn(
            `Could not get Alioth wallet ${aliothWalletId}, falling back to user address: ${aliothError.message}`,
          );
        }
      } else {
        // Try to get the user's first active Alioth wallet using Mongoose
        try {
          this.logger.log(
            `🔍 Querying database for Alioth wallets for user: ${userAddress}`,
          );

          const aliothWallets =
            await this.aliothWalletService.getUserAliothWallets(userAddress);

          this.logger.log(
            `📊 Found ${aliothWallets.length} Alioth wallets in database for user ${userAddress}`,
          );

          if (aliothWallets.length > 0) {
            const activeWallet =
              aliothWallets.find((w) => w.isActive) || aliothWallets[0];
            addressToQuery = activeWallet.aliothWalletAddress;
            this.logger.log(
              `✅ Using Alioth wallet address ${addressToQuery} for portfolio query (user: ${userAddress})`,
            );
          } else {
            this.logger.error(
              `❌ No Alioth wallets found for user ${userAddress}. User must create an Alioth wallet first.`,
            );
            throw new NotFoundException(
              `No Alioth wallets found for user ${userAddress}. Please create an Alioth wallet first using POST /api/v1/alioth-wallet/create`,
            );
          }
        } catch (aliothError) {
          this.logger.error(
            `❌ Failed to get user's Alioth wallets: ${aliothError.message}`,
          );
          throw aliothError;
        }
      }

      // Call getUserPortfolio to get all user positions using the appropriate address
      const portfolioData = await contract.read.getUserPortfolio([
        addressToQuery as Address,
      ]);

      // Type assertion for the portfolio data structure
      const [tokens, receiptTokens, shares, values, symbols, apys] =
        portfolioData as [
          readonly string[],
          readonly string[],
          readonly bigint[],
          readonly bigint[],
          readonly string[],
          readonly bigint[],
        ];

      this.logger.log(
        `✅ Retrieved portfolio for ${addressToQuery}: ${tokens.length} positions`,
      );

      return {
        tokens: tokens.map((addr: string) => addr.toString()),
        receiptTokens: receiptTokens.map((addr: string) => addr.toString()),
        shares: shares.map((share: bigint) => share.toString()),
        values: values.map((value: bigint) => value.toString()),
        symbols: [...symbols],
        apys: apys.map((apy: bigint) => apy.toString()),
      };
    } catch (error) {
      this.logger.error(
        `Error getting portfolio from contract: ${error.message}`,
      );
      throw new NotFoundException(
        `Could not fetch portfolio data: ${error.message}`,
      );
    }
  }

  /**
   * Check if a token is supported by the vault
   */
  async isTokenSupported(
    tokenAddress: string,
    chainId: number,
  ): Promise<boolean> {
    try {
      const chainName = this.getChainName(chainId);
      const contract = this.web3Service.createContract(
        chainName,
        this.aliothVaultAddress as Address,
        MULTI_ASSET_VAULT_V2_ABI,
      );

      const result = await contract.read.isTokenSupported([
        tokenAddress as Address,
      ]);
      return Boolean(result);
    } catch (error) {
      this.logger.error(`Error checking token support: ${error.message}`);
      return false;
    }
  }

  async getUserShares(
    userAddress: string,
    tokenAddress: string,
    chainId: number,
  ): Promise<string> {
    try {
      // Try to get shares from contract first (more accurate)
      try {
        const chainName = this.getChainName(chainId);
        const contract = this.web3Service.createContract(
          chainName,
          this.aliothVaultAddress as Address,
          MULTI_ASSET_VAULT_V2_ABI,
        );

        // Call getUserPortfolio to get real-time shares
        const portfolioData = await contract.read.getUserPortfolio([
          userAddress as Address,
        ]);

        // Type assertion for getUserPortfolio result
        const [tokens, , shares] = portfolioData as [
          readonly string[],
          readonly string[],
          readonly bigint[],
          readonly bigint[],
          readonly string[],
          readonly bigint[],
        ];

        // Find the index of the requested token
        const tokenIndex = tokens.findIndex(
          (t: string) => t.toLowerCase() === tokenAddress.toLowerCase(),
        );

        if (tokenIndex === -1) {
          return '0';
        }

        return shares[tokenIndex].toString();
      } catch (contractError) {
        this.logger.warn(
          `Could not fetch shares from contract: ${contractError.message}`,
        );
      }

      // If contract fails, return 0 shares
      return '0';
    } catch (error) {
      this.logger.error(`Error getting user shares: ${error.message}`);
      return '0';
    }
  }

  async isEmergencyStop(chainId: number): Promise<boolean> {
    try {
      // MultiVaultV2 doesn't have an emergencyStop function
      // For now, we'll assume no emergency stop is active
      // TODO: Check if emergency stop functionality is needed for MultiVaultV2
      return false;
    } catch (error) {
      this.logger.error(`Error checking emergency stop: ${error.message}`);
      // Return false as default if we can't check
      return false;
    }
  }

  private getChainName(chainId: number): string {
    const chainMap: { [key: number]: string } = {
      11155111: 'sepolia', // Sepolia testnet (matches Web3Service)
      43113: 'avalancheFuji', // Avalanche Fuji testnet (matches Web3Service)
    };

    const chainName = chainMap[chainId];
    if (!chainName) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    return chainName;
  }

  /**
   * Get user's Alioth wallet by ID and verify ownership
   */
  private async getUserAliothWallet(
    userAddress: string,
    aliothWalletId: string,
  ): Promise<any> {
    try {
      // Get the Alioth wallet by ID
      const aliothWallet =
        await this.aliothWalletService.getAliothWalletById(aliothWalletId);

      // Verify that the wallet belongs to the user
      if (aliothWallet.userAddress !== userAddress) {
        throw new Error(
          'Unauthorized: Alioth wallet does not belong to this user',
        );
      }

      if (!aliothWallet.isActive) {
        throw new Error('Alioth wallet is inactive');
      }

      return aliothWallet;
    } catch (error) {
      this.logger.error(
        `Failed to get Alioth wallet ${aliothWalletId} for user ${userAddress}:`,
        error,
      );
      throw error;
    }
  }
}
