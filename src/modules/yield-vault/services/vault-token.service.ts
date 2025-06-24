import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Web3Service } from '../../../shared/web3/web3.service';
import { PrivyService } from '../../../shared/privy/privy.service';
import { ChainlinkDataService } from '../../market-analysis/services/chainlink-data.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VaultTokenService {
  private readonly logger = new Logger(VaultTokenService.name);
  private readonly aliothVaultAddress: string;

  constructor(
    private web3Service: Web3Service,
    private chainlinkDataService: ChainlinkDataService,
    private privyService: PrivyService,
    private configService: ConfigService,
  ) {
    this.aliothVaultAddress = this.configService.get<string>(
      'config.contracts.aliothVault',
      '',
    );
  }

  async getTokenPriceUSD(tokenAddress: string): Promise<number> {
    try {
      // Get the token symbol first
      const tokenSymbol = await this.getTokenSymbol(tokenAddress, 11155111);

      this.logger.log(
        `Getting Chainlink price for ${tokenSymbol} (${tokenAddress})`,
      );

      // Try to get price using the multiple token prices method for efficiency
      const priceMap = await this.chainlinkDataService.getMultipleTokenPrices([
        tokenSymbol,
      ]);

      if (priceMap[tokenSymbol]) {
        const price = priceMap[tokenSymbol];
        this.logger.log(
          `✅ Got Chainlink price for ${tokenSymbol}: $${price.toFixed(2)}`,
        );
        return price;
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to get token price for ${tokenAddress}: ${error.message}`,
      );
    }
    return 0;
  }

  /**
   * Get token decimals from contract
   */
  async getTokenDecimals(
    tokenAddress: string,
    chainId: number,
  ): Promise<number> {
    try {
      const chainName = this.getChainName(chainId);
      const publicClient = this.web3Service.getClient(chainName);

      const decimals = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: 'decimals',
            outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'decimals',
      });

      return Number(decimals);
    } catch (error) {
      this.logger.warn(
        `Failed to get decimals for ${tokenAddress}, using default 18: ${error.message}`,
      );
      return 18; // Default to 18 decimals
    }
  }

  async getTokenSymbol(tokenAddress: string, chainId: number): Promise<string> {
    const tokenSymbols: { [address: string]: string } = {
      '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': 'AAVE',
      '0x29f2D40B0605204364af54EC677bD022dA425d03': 'WBTC',
      '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0': 'USDT',
      '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': 'WETH',
      '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c': 'ETH',
      '0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5': 'LINK',
    };

    return tokenSymbols[tokenAddress] || 'UNKNOWN';
  }

  async approveToken(
    userAddress: string,
    aliothWalletId: string,
    tokenAddress: string,
    amount: string,
    chainId: number,
    aliothWallet: any,
  ): Promise<string> {
    this.logger.log(
      `Approving ${amount} of token ${tokenAddress} for vault on chain ${chainId} using Alioth wallet ${aliothWalletId}`,
    );

    try {
      // Execute token approval via Privy-managed Alioth wallet
      const txHash = await this.privyService.ensureTokenApproval(
        aliothWallet.privyWalletId,
        aliothWallet.aliothWalletAddress,
        tokenAddress,
        this.aliothVaultAddress,
        amount,
        chainId,
      );

      this.logger.log(`✅ Token approval transaction executed: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Token approval failed: ${error.message}`);
      throw new BadRequestException(`Token approval failed: ${error.message}`);
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
}
