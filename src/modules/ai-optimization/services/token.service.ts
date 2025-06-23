import { Injectable, Logger } from '@nestjs/common';
import { formatUnits } from 'viem';
import { TokenConfig } from '../dto/optimization.dto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  // Supported tokens with their configurations
  private readonly supportedTokens: Record<string, TokenConfig> = {
    USDC: {
      symbol: 'USDC',
      address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', // Sepolia USDC
      decimals: 6,
    },
    WBTC: {
      symbol: 'WBTC',
      address: '0x29f2D40B0605204364af54EC677bD022dA425d03',
      decimals: 8,
    },
    WETH: {
      symbol: 'WETH',
      address: '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c',
      decimals: 18,
    },
    ETH: {
      symbol: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
    },
    LINK: {
      symbol: 'LINK',
      address: '0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5',
      decimals: 18,
    },
  };

  /**
   * Get token configuration by symbol
   */
  getTokenConfig(symbol: string): TokenConfig | null {
    return this.supportedTokens[symbol.toUpperCase()] || null;
  }

  /**
   * Get token configuration by address
   */
  getTokenConfigByAddress(address: string): TokenConfig | null {
    return (
      Object.values(this.supportedTokens).find(
        (token) => token.address.toLowerCase() === address.toLowerCase(),
      ) || null
    );
  }

  /**
   * Convert token amount (in wei) to human-readable format
   */
  formatTokenAmount(amountWei: string, tokenSymbol: string): string {
    const config = this.getTokenConfig(tokenSymbol);
    if (!config) {
      throw new Error(`Unsupported token: ${tokenSymbol}`);
    }

    return formatUnits(BigInt(amountWei), config.decimals);
  }

  /**
   * Get USD value of token amount
   * For now, using mock prices. In production, integrate with price oracle/API
   */
  async getUSDValue(tokenSymbol: string, amountWei: string): Promise<number> {
    const config = this.getTokenConfig(tokenSymbol);
    if (!config) {
      throw new Error(`Unsupported token: ${tokenSymbol}`);
    }

    // Convert to human-readable amount
    const tokenAmount = parseFloat(
      this.formatTokenAmount(amountWei, tokenSymbol),
    );

    // Mock prices (replace with real price API in production)
    const mockPrices: Record<string, number> = {
      USDC: 1.0,
      WBTC: 105000.0,
      WETH: 2500.0,
      DAI: 1.0,
    };

    const price = mockPrices[tokenSymbol.toUpperCase()] || 0;
    const usdValue = tokenAmount * price;

    this.logger.log(
      `💰 Token conversion: ${tokenAmount} ${tokenSymbol} = $${usdValue.toFixed(2)} (@ $${price})`,
    );

    return usdValue;
  }

  /**
   * Get all supported tokens
   */
  getSupportedTokens(): TokenConfig[] {
    return Object.values(this.supportedTokens);
  }

  /**
   * Validate if token is supported
   */
  isTokenSupported(symbolOrAddress: string): boolean {
    // Check by symbol
    if (this.supportedTokens[symbolOrAddress.toUpperCase()]) {
      return true;
    }

    // Check by address
    return Object.values(this.supportedTokens).some(
      (token) => token.address.toLowerCase() === symbolOrAddress.toLowerCase(),
    );
  }
}
