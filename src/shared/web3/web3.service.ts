import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  http,
  PublicClient,
  WalletClient,
  recoverMessageAddress,
  getContract,
  Address,
  Chain,
} from 'viem';
import { sepolia, avalancheFuji, baseSepolia } from 'viem/chains';

export interface ChainConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  chain: Chain;
  client?: PublicClient;
  walletClient?: WalletClient;
}

@Injectable()
export class Web3Service {
  private readonly logger = new Logger(Web3Service.name);
  private readonly chains: Map<string, ChainConfig> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeChains();
  }

  private initializeChains() {
    const chainConfigs = [
      {
        name: 'sepolia',
        rpcUrl: this.configService.get<string>(
          'config.blockchain.sepolia.rpcUrl',
        ),
        chainId: 11155111,
        chain: sepolia,
      },
      {
        name: 'baseSepolia',
        rpcUrl: this.configService.get<string>(
          'config.blockchain.baseSepolia.rpcUrl',
        ),
        chainId: 84532,
        chain: baseSepolia,
      },
      {
        name: 'avalancheFuji',
        rpcUrl: this.configService.get<string>(
          'config.blockchain.avalancheFuji.rpcUrl',
        ),
        chainId: 43113,
        chain: avalancheFuji,
      },
    ];

    chainConfigs.forEach((config) => {
      if (config.rpcUrl) {
        const chainConfig: ChainConfig = {
          name: config.name,
          rpcUrl: config.rpcUrl,
          chainId: config.chainId,
          chain: config.chain,
          client: createPublicClient({
            chain: config.chain,
            transport: http(config.rpcUrl),
          }) as PublicClient,
        };

        this.chains.set(config.name, chainConfig);
        this.logger.log(`📡 Initialized ${config.name} provider`);
      } else {
        this.logger.warn(`❌ No RPC URL configured for ${config.name}`);
      }
    });

    // Log summary of initialized chains
    this.logger.log(`🌐 Initialized ${this.chains.size} chains:`);
    this.chains.forEach((config, name) => {
      this.logger.log(
        `  - ${name}: Public client: ${!!config.client}, Wallet client: ${!!config.walletClient}`,
      );
    });
  }

  getClient(chainName: string): PublicClient {
    const chain = this.chains.get(chainName);
    if (!chain?.client) {
      throw new Error(`Client not found for chain: ${chainName}`);
    }
    return chain.client;
  }

  getWalletClient(chainName: string): WalletClient {
    const chain = this.chains.get(chainName);
    if (!chain?.walletClient) {
      throw new Error(`Wallet client not found for chain: ${chainName}`);
    }
    return chain.walletClient;
  }

  getChainConfig(chainName: string): ChainConfig {
    const chain = this.chains.get(chainName);
    if (!chain) {
      throw new Error(`Chain config not found: ${chainName}`);
    }
    return chain;
  }

  getAllChains(): ChainConfig[] {
    return Array.from(this.chains.values());
  }

  async getBlockNumber(chainName: string): Promise<bigint> {
    const client = this.getClient(chainName);
    return await client.getBlockNumber();
  }

  async getGasPrice(chainName: string): Promise<bigint> {
    const client = this.getClient(chainName);
    return await client.getGasPrice();
  }

  async getBalance(chainName: string, address: Address): Promise<bigint> {
    const client = this.getClient(chainName);
    return await client.getBalance({ address });
  }

  async verifySignature(
    message: string,
    signature: `0x${string}`,
    expectedAddress: Address,
  ): Promise<boolean> {
    try {
      const recoveredAddress = await recoverMessageAddress({
        message,
        signature,
      });
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      this.logger.error('Signature verification failed:', error);
      return false;
    }
  }

  createContract(chainName: string, address: Address, abi: any) {
    const client = this.getClient(chainName);
    return getContract({
      address,
      abi,
      client,
    });
  }

  createWalletContract(chainName: string, address: Address, abi: any) {
    const publicClient = this.getClient(chainName);
    const walletClient = this.getWalletClient(chainName);
    return getContract({
      address,
      abi,
      client: { public: publicClient, wallet: walletClient },
    });
  }
}
