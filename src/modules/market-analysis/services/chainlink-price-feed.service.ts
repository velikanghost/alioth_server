import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, http, Address } from 'viem';
import { sepolia, baseSepolia, avalancheFuji } from 'viem/chains';

// Chainlink AggregatorV3Interface ABI - This is the correct ABI from Chainlink documentation
const AGGREGATOR_V3_INTERFACE_ABI = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'description',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint80', name: '_roundId', type: 'uint80' }],
    name: 'getRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'version',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestAnswer',
    outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestTimestamp',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestRound',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface ChainlinkPriceFeed {
  address: Address;
  decimals: number;
  description: string;
  symbol: string;
  heartbeat?: number; // Heartbeat interval in seconds
  threshold?: number; // Deviation threshold percentage
}

export interface PriceData {
  price: number;
  timestamp: number;
  roundId: number;
  decimals: number;
  symbol: string;
  isStale: boolean;
  staleness: number; // seconds since last update
}

export interface HistoricalPriceData extends PriceData {
  startedAt: number;
  answeredInRound: number;
}

export interface PriceValidationResult {
  isValid: boolean;
  price: number;
  timestamp: number;
  warnings: string[];
  errors: string[];
}

@Injectable()
export class ChainlinkPriceFeedService {
  private readonly logger = new Logger(ChainlinkPriceFeedService.name);

  // Maximum age for price data in seconds
  private readonly MAX_PRICE_AGE = 3600; // 1 hour
  private readonly VALIDATION_THRESHOLD = 0.1; // 10% deviation threshold

  // Chainlink Data Feed addresses for different networks
  private readonly PRICE_FEEDS: Record<
    number,
    Record<string, ChainlinkPriceFeed>
  > = {
    // Ethereum Sepolia Testnet (Chain ID: 11155111) - Testnet addresses from Chainlink docs
    11155111: {
      ETH: {
        address: '0x694AA1769357215DE4FAC081bf1f309aDC325306' as Address,
        decimals: 8,
        description: 'ETH / USD',
        symbol: 'ETH',
        heartbeat: 3600, // 1 hour
        threshold: 0.5, // 0.5%
      },
      BTC: {
        address: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' as Address,
        decimals: 8,
        description: 'BTC / USD',
        symbol: 'BTC',
        heartbeat: 3600, // 1 hour
        threshold: 0.5, // 0.5%
      },
      LINK: {
        address: '0xc59E3633BAAC79493d908e63626716e204A45EdF' as Address,
        decimals: 8,
        description: 'LINK / USD',
        symbol: 'LINK',
        heartbeat: 3600, // 1 hour
        threshold: 1.0, // 1%
      },
      USDC: {
        address: '0x1aD0B0f24692CddfF368202880f29e99ae38Cec5' as Address,
        decimals: 6,
        description: 'USDC / USD',
        symbol: 'USDC',
        heartbeat: 3600, // 1 hour
        threshold: 1.0, // 1%
      },
    },
    // Base sepolia testnet (Chain ID: 84532) - Testnet addresses from Chainlink docs
    84532: {
      USDC: {
        address: '0xbE1fa364a5325FB30f4B8E3ECDc889c59303638A' as Address,
        decimals: 6,
        description: 'USDC / USD',
        symbol: 'USDC',
        heartbeat: 3600, // 1 hour
        threshold: 1.0, // 1%
      },
    },
    // Avalanche Fuji Testnet (Chain ID: 43113) - Testnet addresses from Chainlink docs
    43113: {
      ETH: {
        address: '0x8BA1D001466b23F844041112E92a07e99Cb439F6' as Address,
        decimals: 8,
        description: 'ETH / USD',
        symbol: 'ETH',
        heartbeat: 3600, // 1 hour
        threshold: 0.5, // 0.5%
      },
      USDC: {
        address: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' as Address,
        decimals: 6,
        description: 'USDC / USD',
        symbol: 'USDC',
        heartbeat: 3600, // 1 hour
        threshold: 0.5, // 0.5%
      },
      LINK: {
        address: '0x041867bd08EE0d421c975b1B9129434C6a0a2b1c' as Address,
        decimals: 8,
        description: 'LINK / USD',
        symbol: 'LINK',
        heartbeat: 3600, // 1 hour
        threshold: 1.0, // 1%
      },
    },
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get USD price for a token using Chainlink Data Feeds
   * This follows the official Chainlink documentation: https://docs.chain.link/data-feeds/price-feeds
   */
  async getTokenPriceUSD(
    symbol: string,
    chainId: number = 11155111,
  ): Promise<PriceData> {
    this.logger.log(
      `🔗 Getting Chainlink price for ${symbol} on chain ${chainId}`,
    );

    try {
      // Get price feed configuration
      const chainFeeds = this.PRICE_FEEDS[chainId];
      if (!chainFeeds) {
        throw new Error(`❌ No price feeds configured for chain: ${chainId}`);
      }

      const priceFeed = chainFeeds[symbol.toUpperCase()];
      if (!priceFeed) {
        throw new Error(`❌ No price feed found for symbol: ${symbol}`);
      }

      // Create public client for the specific chain
      const client = createPublicClient({
        chain: this.getChainConfig(chainId),
        transport: http(this.getRpcUrl(chainId)),
      });

      // Get the actual decimals from the contract
      const decimalsResult = await client.readContract({
        address: priceFeed.address,
        abi: AGGREGATOR_V3_INTERFACE_ABI,
        functionName: 'decimals',
      });
      const actualDecimals = Number(decimalsResult);

      this.logger.log(
        `📊 ${symbol} feed decimals: ${actualDecimals} (configured: ${priceFeed.decimals})`,
      );

      // Call latestRoundData function
      const result = await client.readContract({
        address: priceFeed.address,
        abi: AGGREGATOR_V3_INTERFACE_ABI,
        functionName: 'latestRoundData',
      });

      // Extract the returned data (using type assertion for proper handling)
      const [roundId, answer, startedAt, updatedAt, answeredInRound] = result;

      // Validate the price data
      if (answer <= 0) {
        throw new Error(`Invalid price data: answer is ${answer}`);
      }

      // Convert price from Chainlink format using actual decimals from contract
      const price = Number(answer) / Math.pow(10, actualDecimals);

      // Validate freshness (ensure price is not stale)
      const now = Math.floor(Date.now() / 1000);
      const updatedAtSeconds = Number(updatedAt);
      const staleness = now - updatedAtSeconds;
      const maxAge = priceFeed.heartbeat
        ? priceFeed.heartbeat * 2
        : this.MAX_PRICE_AGE;
      const isStale = staleness > maxAge;

      if (isStale) {
        this.logger.warn(
          `⚠️ Stale price data for ${symbol}. Last updated: ${new Date(updatedAtSeconds * 1000)} (${staleness}s ago)`,
        );
      }

      const priceData: PriceData = {
        price,
        timestamp: updatedAtSeconds,
        roundId: Number(roundId),
        decimals: actualDecimals,
        symbol: priceFeed.symbol,
        isStale,
        staleness,
      };

      this.logger.log(
        `✅ ${symbol}/USD: $${price.toFixed(2)} (Round: ${roundId}, Updated: ${new Date(updatedAtSeconds * 1000).toISOString()}, Staleness: ${staleness}s)`,
      );

      return priceData;
    } catch (error) {
      this.logger.error(
        `❌ Failed to get Chainlink price for ${symbol}: ${error.message}`,
      );
      throw new Error(`Unable to fetch price for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Get historical price data for a specific round
   */
  async getHistoricalPriceData(
    symbol: string,
    roundId: number,
    chainId: number = 11155111,
  ): Promise<HistoricalPriceData> {
    this.logger.log(
      `🔗 Getting historical Chainlink price for ${symbol} round ${roundId} on chain ${chainId}`,
    );

    try {
      const chainFeeds = this.PRICE_FEEDS[chainId];
      if (!chainFeeds) {
        throw new Error(`❌ No price feeds configured for chain: ${chainId}`);
      }

      const priceFeed = chainFeeds[symbol.toUpperCase()];
      if (!priceFeed) {
        throw new Error(`❌ No price feed found for symbol: ${symbol}`);
      }

      const client = createPublicClient({
        chain: this.getChainConfig(chainId),
        transport: http(this.getRpcUrl(chainId)),
      });

      // Get the actual decimals from the contract
      const decimalsResult = await client.readContract({
        address: priceFeed.address,
        abi: AGGREGATOR_V3_INTERFACE_ABI,
        functionName: 'decimals',
      });
      const actualDecimals = Number(decimalsResult);

      this.logger.log(
        `📊 Historical ${symbol} feed decimals: ${actualDecimals} (configured: ${priceFeed.decimals})`,
      );

      // Call getRoundData function for historical data
      const result = await client.readContract({
        address: priceFeed.address,
        abi: AGGREGATOR_V3_INTERFACE_ABI,
        functionName: 'getRoundData',
        args: [BigInt(roundId)],
      });

      const [returnedRoundId, answer, startedAt, updatedAt, answeredInRound] =
        result;

      if (answer <= 0) {
        throw new Error(`Invalid historical price data: answer is ${answer}`);
      }

      const price = Number(answer) / Math.pow(10, actualDecimals);
      const now = Math.floor(Date.now() / 1000);
      const updatedAtSeconds = Number(updatedAt);
      const staleness = now - updatedAtSeconds;

      const historicalData: HistoricalPriceData = {
        price,
        timestamp: updatedAtSeconds,
        roundId: Number(returnedRoundId),
        decimals: actualDecimals,
        symbol: priceFeed.symbol,
        isStale: false, // Historical data is by definition old
        staleness,
        startedAt: Number(startedAt),
        answeredInRound: Number(answeredInRound),
      };

      this.logger.log(
        `✅ Historical ${symbol}/USD: $${price.toFixed(2)} (Round: ${returnedRoundId}, Updated: ${new Date(updatedAtSeconds * 1000).toISOString()})`,
      );

      return historicalData;
    } catch (error) {
      this.logger.error(
        `❌ Failed to get historical Chainlink price for ${symbol} round ${roundId}: ${error.message}`,
      );
      throw new Error(
        `Unable to fetch historical price for ${symbol}: ${error.message}`,
      );
    }
  }

  /**
   * Get multiple token prices in parallel
   */
  async getMultipleTokenPrices(
    symbols: string[],
    chainId: number = 11155111,
  ): Promise<Record<string, PriceData>> {
    this.logger.log(
      `🔗 Getting Chainlink prices for ${symbols.length} tokens: ${symbols.join(', ')}`,
    );

    try {
      const pricePromises = symbols.map(async (symbol) => {
        try {
          const price = await this.getTokenPriceUSD(symbol, chainId);
          return { symbol: symbol.toUpperCase(), price };
        } catch (error) {
          this.logger.warn(
            `⚠️ Failed to get price for ${symbol}: ${error.message}`,
          );
          return null;
        }
      });

      const results = await Promise.all(pricePromises);
      const priceMap: Record<string, PriceData> = {};

      results.forEach((result) => {
        if (result) {
          priceMap[result.symbol] = result.price;
        }
      });

      return priceMap;
    } catch (error) {
      this.logger.error(
        `❌ Failed to get multiple token prices: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Validate price data against multiple sources
   */
  async validatePriceData(
    symbol: string,
    expectedPrice: number,
    chainId: number = 11155111,
  ): Promise<PriceValidationResult> {
    try {
      const chainlinkPrice = await this.getTokenPriceUSD(symbol, chainId);
      const deviation =
        Math.abs(expectedPrice - chainlinkPrice.price) / chainlinkPrice.price;

      const warnings: string[] = [];
      const errors: string[] = [];

      if (chainlinkPrice.isStale) {
        warnings.push(`Price data is stale (${chainlinkPrice.staleness}s old)`);
      }

      if (deviation > this.VALIDATION_THRESHOLD) {
        errors.push(
          `Price deviation too high: ${(deviation * 100).toFixed(2)}%`,
        );
      }

      const isValid =
        errors.length === 0 && deviation <= this.VALIDATION_THRESHOLD;

      return {
        isValid,
        price: chainlinkPrice.price,
        timestamp: chainlinkPrice.timestamp,
        warnings,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        price: 0,
        timestamp: 0,
        warnings: [],
        errors: [`Failed to validate price: ${error.message}`],
      };
    }
  }

  /**
   * Check if a price feed exists for a given symbol and chain
   */
  isPriceFeedAvailable(symbol: string, chainId: number): boolean {
    const chainFeeds = this.PRICE_FEEDS[chainId];
    return !!(chainFeeds && chainFeeds[symbol.toUpperCase()]);
  }

  /**
   * Get all available symbols for a chain
   */
  getAvailableSymbols(chainId: number): string[] {
    const chainFeeds = this.PRICE_FEEDS[chainId];
    return chainFeeds ? Object.keys(chainFeeds) : [];
  }

  /**
   * Get price feed information
   */
  getPriceFeedInfo(symbol: string, chainId: number): ChainlinkPriceFeed | null {
    const chainFeeds = this.PRICE_FEEDS[chainId];
    return chainFeeds?.[symbol.toUpperCase()] || null;
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): number[] {
    return Object.keys(this.PRICE_FEEDS).map(Number);
  }

  /**
   * Get feed configuration details for debugging
   */
  async getFeedDescription(
    symbol: string,
    chainId: number = 11155111,
  ): Promise<string> {
    try {
      const priceFeed = this.getPriceFeedInfo(symbol, chainId);
      if (!priceFeed) {
        throw new Error(
          `No price feed found for ${symbol} on chain ${chainId}`,
        );
      }

      const client = createPublicClient({
        chain: this.getChainConfig(chainId),
        transport: http(this.getRpcUrl(chainId)),
      });

      const description = await client.readContract({
        address: priceFeed.address,
        abi: AGGREGATOR_V3_INTERFACE_ABI,
        functionName: 'description',
      });

      return description;
    } catch (error) {
      this.logger.error(`Failed to get feed description: ${error.message}`);
      throw error;
    }
  }

  private getChainConfig(chainId: number) {
    switch (chainId) {
      case 11155111:
        return sepolia;
      case 84532:
        return baseSepolia;
      case 43113:
        return avalancheFuji;
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  }

  private getRpcUrl(chainId: number): string {
    switch (chainId) {
      case 11155111:
        return (
          this.configService.get<string>('config.blockchain.sepolia.rpcUrl') ||
          'https://rpc.sepolia.org'
        );
      case 84532:
        return (
          this.configService.get<string>(
            'config.blockchain.baseSepolia.rpcUrl',
          ) || 'https://base-sepolia.g.alchemy.com/v2/demo'
        );
      case 43113:
        return (
          this.configService.get<string>(
            'config.blockchain.avalancheFuji.rpcUrl',
          ) || 'https://avalanche-fuji.g.alchemy.com/v2/demo'
        );
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  }
}
