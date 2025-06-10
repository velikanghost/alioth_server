import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Web3Service } from '../../../shared/web3/web3.service';
import {
  APRSnapshot,
  APRSnapshotDocument,
} from '../schemas/apr-snapshot.schema';
import { Vault, VaultDocument } from '../schemas/vault.schema';

interface ProtocolConfig {
  name: string;
  chains: number[];
  contractAddresses: { [chainId: number]: string };
  supportedTokens: { [chainId: number]: string[] };
}

@Injectable()
export class APRTrackingService {
  private readonly logger = new Logger(APRTrackingService.name);

  // Protocol configurations
  private readonly protocols: ProtocolConfig[] = [
    {
      name: 'aave',
      chains: [1, 11155111], // Ethereum mainnet and Sepolia
      contractAddresses: {
        1: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Aave V3 Pool mainnet
        11155111: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951', // Aave V3 Pool Sepolia
      },
      supportedTokens: {
        11155111: [
          '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a', // AAVE
          '0x29f2D40B0605204364af54EC677bD022dA425d03', // WBTC
          '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH
        ],
      },
    },
    // Add more protocols here (Compound, Curve, etc.)
  ];

  constructor(
    @InjectModel(APRSnapshot.name)
    private aprSnapshotModel: Model<APRSnapshotDocument>,
    @InjectModel(Vault.name) private vaultModel: Model<VaultDocument>,
    private web3Service: Web3Service,
  ) {}

  // @Cron(CronExpression.EVERY_15_MINUTES) - TODO: Add @nestjs/schedule package
  async trackAPRsAcrossProtocols(): Promise<void> {
    this.logger.log('Starting APR tracking across all protocols...');

    try {
      const snapshots: APRSnapshot[] = [];

      for (const protocol of this.protocols) {
        for (const chainId of protocol.chains) {
          const protocolSnapshots = await this.trackProtocolAPRs(
            protocol,
            chainId,
          );
          snapshots.push(...protocolSnapshots);
        }
      }

      // Save all snapshots
      if (snapshots.length > 0) {
        await this.aprSnapshotModel.insertMany(snapshots);
        this.logger.log(`Saved ${snapshots.length} APR snapshots`);
      }

      // Update vault APRs
      await this.updateVaultAPRs();
    } catch (error) {
      this.logger.error('Error tracking APRs:', error);
    }
  }

  async getAPRHistory(
    tokenAddress?: string,
    chainId?: number,
    protocolName?: string,
    hours: number = 24,
  ): Promise<APRSnapshot[]> {
    const query: any = {
      timestamp: {
        $gte: new Date(Date.now() - hours * 60 * 60 * 1000),
      },
    };

    if (tokenAddress) query.tokenAddress = tokenAddress;
    if (chainId) query.chainId = chainId;
    if (protocolName) query.protocolName = protocolName;

    return this.aprSnapshotModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(1000)
      .exec();
  }

  async getBestAPRForToken(
    tokenAddress: string,
    chainId: number,
  ): Promise<APRSnapshot | null> {
    const latestSnapshots = await this.aprSnapshotModel
      .find({
        tokenAddress,
        chainId,
        timestamp: {
          $gte: new Date(Date.now() - 2 * 60 * 60 * 1000), // Last 2 hours
        },
      })
      .sort({ totalAPY: -1 })
      .limit(1)
      .exec();

    return latestSnapshots[0] || null;
  }

  async getOptimalAllocation(
    tokenAddress: string,
    chainId: number,
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
  ): Promise<{ [protocolName: string]: number }> {
    const recentSnapshots = await this.aprSnapshotModel
      .find({
        tokenAddress,
        chainId,
        timestamp: {
          $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      })
      .sort({ totalAPY: -1 })
      .exec();

    if (recentSnapshots.length === 0) {
      return { aave: 100 }; // Default allocation
    }

    // Calculate optimal allocation based on risk profile
    const allocation: { [protocolName: string]: number } = {};

    switch (riskProfile) {
      case 'conservative':
        // Focus on most established protocols
        allocation[recentSnapshots[0].protocolName] = 100;
        break;

      case 'moderate':
        // Distribute between top 2-3 protocols
        if (recentSnapshots.length >= 2) {
          allocation[recentSnapshots[0].protocolName] = 60;
          allocation[recentSnapshots[1].protocolName] = 40;
        } else {
          allocation[recentSnapshots[0].protocolName] = 100;
        }
        break;

      case 'aggressive':
        // Maximize APY regardless of risk
        allocation[recentSnapshots[0].protocolName] = 100;
        break;
    }

    return allocation;
  }

  private async trackProtocolAPRs(
    protocol: ProtocolConfig,
    chainId: number,
  ): Promise<APRSnapshot[]> {
    const snapshots: APRSnapshot[] = [];
    const supportedTokens = protocol.supportedTokens[chainId] || [];

    this.logger.log(
      `Tracking ${protocol.name} APRs on chain ${chainId} for ${supportedTokens.length} tokens`,
    );

    for (const tokenAddress of supportedTokens) {
      try {
        const snapshot = await this.getProtocolAPRSnapshot(
          protocol,
          chainId,
          tokenAddress,
        );
        if (snapshot) {
          snapshots.push(snapshot);
        }
      } catch (error) {
        this.logger.error(
          `Error tracking ${protocol.name} APR for token ${tokenAddress}:`,
          error,
        );
      }
    }

    return snapshots;
  }

  private async getProtocolAPRSnapshot(
    protocol: ProtocolConfig,
    chainId: number,
    tokenAddress: string,
  ): Promise<APRSnapshot | null> {
    try {
      // Get current block number
      const blockNumber = await this.web3Service.getBlockNumber(
        this.getChainName(chainId),
      );

      // Mock APR data for now - in production, this would fetch from actual protocols
      const mockAPRData = this.generateMockAPRData(protocol.name, tokenAddress);

      const snapshot = new this.aprSnapshotModel({
        chainId,
        protocolName: protocol.name,
        tokenAddress,
        tokenSymbol: this.getTokenSymbol(tokenAddress),
        supplyAPR: mockAPRData.supplyAPR,
        rewardAPR: mockAPRData.rewardAPR,
        totalAPY: mockAPRData.totalAPY,
        totalValueLocked: mockAPRData.tvl,
        utilizationRate: mockAPRData.utilizationRate,
        additionalMetrics: mockAPRData.additionalMetrics,
        protocolData: {
          contractAddress: protocol.contractAddresses[chainId],
          poolAddress: protocol.contractAddresses[chainId],
        },
        riskMetrics: mockAPRData.riskMetrics,
        timestamp: new Date(),
        blockNumber,
      });

      return snapshot;
    } catch (error) {
      this.logger.error(
        `Error getting APR snapshot for ${protocol.name}:`,
        error,
      );
      return null;
    }
  }

  private generateMockAPRData(protocolName: string, tokenAddress: string) {
    // Generate realistic mock data based on protocol and token
    const baseAPR = this.getBaseAPR(protocolName, tokenAddress);
    const variation = (Math.random() - 0.5) * 2; // ±1% variation

    const supplyAPR = Math.max(0.1, baseAPR + variation);
    const rewardAPR = Math.random() * 2; // 0-2% rewards
    const totalAPY = supplyAPR + rewardAPR + (supplyAPR * rewardAPR) / 100; // Compound effect

    return {
      supplyAPR,
      rewardAPR,
      totalAPY,
      tvl: Math.random() * 100000000, // $0-100M TVL
      utilizationRate: Math.random() * 80 + 10, // 10-90% utilization
      additionalMetrics: {
        borrowAPR: supplyAPR + Math.random() * 5,
        reserveFactor: Math.random() * 20,
        supplyCap: Math.random() * 1000000,
      },
      riskMetrics: {
        protocolRiskScore: this.getProtocolRiskScore(protocolName),
        liquidityRisk: Math.random() * 5 + 1,
        smartContractRisk: Math.random() * 3 + 1,
        volatilityScore: this.getTokenVolatilityScore(tokenAddress),
      },
    };
  }

  private getBaseAPR(protocolName: string, tokenAddress: string): number {
    // Base APRs by protocol and token (realistic estimates)
    const aprMap: { [protocol: string]: { [token: string]: number } } = {
      aave: {
        '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': 4.5, // AAVE
        '0x29f2D40B0605204364af54EC677bD022dA425d03': 3.2, // WBTC
        '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': 2.8, // WETH
      },
      compound: {
        '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': 4.2,
        '0x29f2D40B0605204364af54EC677bD022dA425d03': 3.0,
        '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': 2.5,
      },
    };

    return aprMap[protocolName]?.[tokenAddress] || 3.0;
  }

  private getProtocolRiskScore(protocolName: string): number {
    const riskScores: { [protocol: string]: number } = {
      aave: 8.5, // Very safe
      compound: 8.0,
      curve: 7.5,
      yearn: 7.0,
    };

    return riskScores[protocolName] || 6.0;
  }

  private getTokenVolatilityScore(tokenAddress: string): number {
    const volatilityScores: { [token: string]: number } = {
      '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': 6.5, // AAVE - Medium volatility
      '0x29f2D40B0605204364af54EC677bD022dA425d03': 4.0, // WBTC - Lower volatility
      '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': 5.0, // WETH - Medium volatility
    };

    return volatilityScores[tokenAddress] || 5.0;
  }

  private getTokenSymbol(tokenAddress: string): string {
    const tokenSymbols: { [address: string]: string } = {
      '0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a': 'AAVE',
      '0x29f2D40B0605204364af54EC677bD022dA425d03': 'WBTC',
      '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': 'WETH',
      '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0': 'USDT',
    };

    return tokenSymbols[tokenAddress] || 'UNKNOWN';
  }

  private getChainName(chainId: number): string {
    const chainNames: { [id: number]: string } = {
      11155111: 'sepolia',
      84532: 'baseSepolia',
      43113: 'avalancheFuji',
    };

    return chainNames[chainId] || 'unknown';
  }

  private async updateVaultAPRs(): Promise<void> {
    const vaults = await this.vaultModel.find({ status: 'active' });

    for (const vault of vaults) {
      try {
        // Get latest snapshots for this vault's token
        const recentSnapshots = await this.aprSnapshotModel
          .find({
            tokenAddress: vault.tokenAddress,
            chainId: vault.chainId,
            timestamp: {
              $gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
            },
          })
          .exec();

        if (recentSnapshots.length > 0) {
          // Calculate weighted APR based on current allocations
          let weightedAPR = 0;
          let totalAllocation = 0;

          for (const strategy of vault.activeStrategies) {
            const protocolSnapshot = recentSnapshots.find(
              (s) => s.protocolName === strategy.protocolName,
            );

            if (protocolSnapshot) {
              weightedAPR +=
                protocolSnapshot.totalAPY * (strategy.allocation / 100);
              totalAllocation += strategy.allocation;
            }
          }

          if (totalAllocation > 0) {
            vault.currentAPR = weightedAPR;
            await vault.save();
          }
        }
      } catch (error) {
        this.logger.error(
          `Error updating vault APR for ${vault.tokenSymbol}:`,
          error,
        );
      }
    }
  }
}
