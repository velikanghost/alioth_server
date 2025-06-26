import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Web3Service } from '../../../shared/web3/web3.service';
import {
  AllocationStrategy,
  TransactionResult,
  PerformanceMetrics,
} from '../dto/optimization.dto';
import { Address, parseUnits, formatUnits, Abi } from 'viem';

export interface OptimizationExecutionParams {
  userAddress: Address;
  inputToken: Address;
  inputAmount: bigint;
  allocations: AllocationStrategy[];
  maxSlippage: number;
  deadline: number;
}

export interface ChainlinkEvent {
  eventType: 'price_validation' | 'automation_trigger' | 'upkeep_performed';
  transactionHash: string;
  blockNumber: number;
  optimizationId?: string;
  eventData: Record<string, any>;
}

@Injectable()
export class YieldOptimizerService {
  private readonly logger = new Logger(YieldOptimizerService.name);
  private readonly enhancedYieldOptimizerAddress: Address;
  private readonly chainlinkFeedManagerAddress: Address;
  private readonly defaultChain = 'sepolia';

  // Enhanced Yield Optimizer ABI (simplified for MVP)
  private readonly YIELD_OPTIMIZER_ABI: Abi = [
    {
      type: 'function',
      name: 'optimizeDeposit',
      inputs: [
        { name: 'inputToken', type: 'address' },
        { name: 'inputAmount', type: 'uint256' },
        {
          name: 'allocations',
          type: 'tuple[]',
          components: [
            { name: 'protocol', type: 'uint8' },
            { name: 'percentage', type: 'uint256' },
            { name: 'minExpectedAPY', type: 'uint256' },
          ],
        },
        { name: 'maxSlippage', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
      outputs: [{ name: 'operationId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getUserOptimizations',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [
        {
          name: 'optimizations',
          type: 'tuple[]',
          components: [
            { name: 'operationId', type: 'bytes32' },
            { name: 'inputToken', type: 'address' },
            { name: 'inputAmount', type: 'uint256' },
            { name: 'status', type: 'uint8' },
            { name: 'timestamp', type: 'uint256' },
          ],
        },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getOptimizationPerformance',
      inputs: [{ name: 'operationId', type: 'bytes32' }],
      outputs: [
        { name: 'currentValue', type: 'uint256' },
        { name: 'totalReturn', type: 'int256' },
        { name: 'apy', type: 'uint256' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'event',
      name: 'YieldOptimized',
      inputs: [
        { name: 'user', type: 'address', indexed: true },
        { name: 'operationId', type: 'bytes32', indexed: true },
        { name: 'inputToken', type: 'address', indexed: false },
        { name: 'inputAmount', type: 'uint256', indexed: false },
        { name: 'timestamp', type: 'uint256', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'AutomationRegistered',
      inputs: [
        { name: 'operationId', type: 'bytes32', indexed: true },
        { name: 'automationId', type: 'uint256', indexed: true },
        { name: 'user', type: 'address', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'RebalanceExecuted',
      inputs: [
        { name: 'operationId', type: 'bytes32', indexed: true },
        {
          name: 'newAllocations',
          type: 'tuple[]',
          indexed: false,
          components: [
            { name: 'protocol', type: 'uint8' },
            { name: 'percentage', type: 'uint256' },
          ],
        },
        { name: 'timestamp', type: 'uint256', indexed: false },
      ],
    },
  ] as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly web3Service: Web3Service,
  ) {
    this.enhancedYieldOptimizerAddress = this.configService.get<Address>(
      'config.contracts.enhancedYieldOptimizer',
      '0x0000000000000000000000000000000000000000',
    );
    this.chainlinkFeedManagerAddress = this.configService.get<Address>(
      'config.contracts.chainlinkFeedManager',
      '0x0000000000000000000000000000000000000000',
    );

    this.logger.log(
      `🏦 Yield Optimizer: ${this.enhancedYieldOptimizerAddress}`,
    );
    this.logger.log(`📊 Feed Manager: ${this.chainlinkFeedManagerAddress}`);
  }

  async executeOptimizedDeposit(
    params: OptimizationExecutionParams,
  ): Promise<TransactionResult> {
    this.logger.log(
      `Executing optimized deposit for ${params.userAddress} with ${params.inputAmount.toString()} of ${params.inputToken}`,
    );

    try {
      // 1. Get wallet contract instance
      const contract = this.web3Service.createWalletContract(
        this.defaultChain,
        this.enhancedYieldOptimizerAddress,
        this.YIELD_OPTIMIZER_ABI,
      );

      // 2. Prepare contract call data
      const contractAllocations = params.allocations.map((alloc) => ({
        protocol: this.mapProtocolToEnum(alloc.protocol),
        percentage: parseUnits(alloc.percentage.toString(), 2), // 2 decimals for percentage
        minExpectedAPY: parseUnits(alloc.expectedAPY.toString(), 4), // 4 decimals for APY
      }));

      const callArgs = [
        params.inputToken,
        params.inputAmount,
        contractAllocations,
        parseUnits(params.maxSlippage.toString(), 4), // 4 decimals for slippage
        BigInt(params.deadline),
      ];

      // 3. Get chain for transaction options
      const chain = this.web3Service.getChainConfig(this.defaultChain).chain;

      // 4. Estimate gas
      const gasEstimate = await contract.estimateGas.optimizeDeposit(callArgs, {
        account: params.userAddress,
      });

      this.logger.log(`Gas estimate: ${gasEstimate.toString()}`);

      // 5. Execute transaction
      const txHash = await contract.write.optimizeDeposit(callArgs, {
        account: params.userAddress,
        chain,
      });

      this.logger.log(`✅ Transaction submitted: ${txHash}`);

      // 5. Wait for transaction confirmation
      const receipt = await this.web3Service
        .getClient(this.defaultChain)
        .waitForTransactionReceipt({ hash: txHash });

      this.logger.log(
        `✅ Transaction confirmed in block ${receipt.blockNumber}`,
      );

      return {
        hash: txHash,
        success: receipt.status === 'success',
        gasUsed: Number(receipt.gasUsed),
        blockNumber: Number(receipt.blockNumber),
      };
    } catch (error) {
      this.logger.error(
        `Failed to execute optimized deposit: ${error.message}`,
        error.stack,
      );

      return {
        hash: '',
        success: false,
        error: error.message,
      };
    }
  }

  async getUserOptimizations(userAddress: Address): Promise<any[]> {
    this.logger.log(`Getting optimizations for user: ${userAddress}`);

    try {
      const contract = this.web3Service.createContract(
        this.defaultChain,
        this.enhancedYieldOptimizerAddress,
        this.YIELD_OPTIMIZER_ABI,
      );

      const optimizations = await contract.read.getUserOptimizations([
        userAddress,
      ]);

      return Array.isArray(optimizations) ? optimizations : [];
    } catch (error) {
      this.logger.error(`Failed to get user optimizations: ${error.message}`);
      return [];
    }
  }

  async getOptimizationPerformance(
    operationId: string,
  ): Promise<PerformanceMetrics> {
    this.logger.log(`Getting performance for operation: ${operationId}`);

    try {
      const contract = this.web3Service.createContract(
        this.defaultChain,
        this.enhancedYieldOptimizerAddress,
        this.YIELD_OPTIMIZER_ABI,
      );

      const result = await contract.read.getOptimizationPerformance([
        operationId as `0x${string}`,
      ]);

      // Type assertion since we know the structure from ABI
      const [currentValue, totalReturn, apy] = result as [
        bigint,
        bigint,
        bigint,
      ];

      return {
        totalValue: Number(formatUnits(currentValue, 18)),
        totalReturn: Number(formatUnits(totalReturn, 18)),
        apy: Number(formatUnits(apy, 4)),
        riskScore: 3, // Default risk score, should be calculated
        lastUpdate: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get optimization performance: ${error.message}`,
      );

      // Return default metrics on error
      return {
        totalValue: 0,
        totalReturn: 0,
        apy: 0,
        riskScore: 0,
        lastUpdate: new Date(),
      };
    }
  }

  async listenToChainlinkEvents(): Promise<void> {
    this.logger.log('🎧 Starting Chainlink event listeners');

    try {
      const client = this.web3Service.getClient(this.defaultChain);

      // Listen for YieldOptimized events
      const unsubscribeYieldOptimized = client.watchContractEvent({
        address: this.enhancedYieldOptimizerAddress,
        abi: this.YIELD_OPTIMIZER_ABI,
        eventName: 'YieldOptimized',
        onLogs: (logs) => {
          logs.forEach((log) => {
            this.handleYieldOptimizedEvent(log);
          });
        },
      });

      // Listen for AutomationRegistered events
      const unsubscribeAutomation = client.watchContractEvent({
        address: this.enhancedYieldOptimizerAddress,
        abi: this.YIELD_OPTIMIZER_ABI,
        eventName: 'AutomationRegistered',
        onLogs: (logs) => {
          logs.forEach((log) => {
            this.handleAutomationRegisteredEvent(log);
          });
        },
      });

      // Listen for RebalanceExecuted events
      const unsubscribeRebalance = client.watchContractEvent({
        address: this.enhancedYieldOptimizerAddress,
        abi: this.YIELD_OPTIMIZER_ABI,
        eventName: 'RebalanceExecuted',
        onLogs: (logs) => {
          logs.forEach((log) => {
            this.handleRebalanceExecutedEvent(log);
          });
        },
      });

      this.logger.log('✅ Event listeners established successfully');

      // Store unsubscribe functions for cleanup
      // In production, you'd want to store these for proper cleanup
    } catch (error) {
      this.logger.error(`Failed to set up event listeners: ${error.message}`);
    }
  }

  private handleYieldOptimizedEvent(log: any): void {
    this.logger.log(`📊 YieldOptimized event detected: ${log.transactionHash}`);

    const eventData: ChainlinkEvent = {
      eventType: 'automation_trigger',
      transactionHash: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      optimizationId: log.args?.operationId,
      eventData: {
        user: log.args?.user,
        inputToken: log.args?.inputToken,
        inputAmount: log.args?.inputAmount?.toString(),
        timestamp: log.args?.timestamp?.toString(),
      },
    };

    // Emit to WebSocket or save to database
    this.emitChainlinkEvent(eventData);
  }

  private handleAutomationRegisteredEvent(log: any): void {
    this.logger.log(`🤖 AutomationRegistered event: ${log.transactionHash}`);

    const eventData: ChainlinkEvent = {
      eventType: 'automation_trigger',
      transactionHash: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      optimizationId: log.args?.operationId,
      eventData: {
        automationId: log.args?.automationId?.toString(),
        user: log.args?.user,
      },
    };

    this.emitChainlinkEvent(eventData);
  }

  private handleRebalanceExecutedEvent(log: any): void {
    this.logger.log(`⚖️ RebalanceExecuted event: ${log.transactionHash}`);

    const eventData: ChainlinkEvent = {
      eventType: 'upkeep_performed',
      transactionHash: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      optimizationId: log.args?.operationId,
      eventData: {
        newAllocations: log.args?.newAllocations,
        timestamp: log.args?.timestamp?.toString(),
      },
    };

    this.emitChainlinkEvent(eventData);
  }

  private emitChainlinkEvent(eventData: ChainlinkEvent): void {
    // This will be connected to WebSocket gateway
    this.logger.log(`📡 Emitting Chainlink event: ${eventData.eventType}`);
    // TODO: Emit to WebSocket gateway when created
  }

  private mapProtocolToEnum(protocol: string): number {
    const protocolMap: Record<string, number> = {
      aave: 0,
      'aave-v3': 0,
      compound: 1,
      'compound-v3': 1,
      yearn: 2,
      'yearn-v3': 2,
    };

    return protocolMap[protocol.toLowerCase()] ?? 0;
  }

  async estimateGasForOptimization(
    params: OptimizationExecutionParams,
  ): Promise<bigint> {
    try {
      const contract = this.web3Service.createContract(
        this.defaultChain,
        this.enhancedYieldOptimizerAddress,
        this.YIELD_OPTIMIZER_ABI,
      );

      const contractAllocations = params.allocations.map((alloc) => ({
        protocol: this.mapProtocolToEnum(alloc.protocol),
        percentage: parseUnits(alloc.percentage.toString(), 2),
        minExpectedAPY: parseUnits(alloc.expectedAPY.toString(), 4),
      }));

      const callArgs = [
        params.inputToken,
        params.inputAmount,
        contractAllocations,
        parseUnits(params.maxSlippage.toString(), 4),
        BigInt(params.deadline),
      ];

      return await contract.estimateGas.optimizeDeposit(callArgs, {
        account: params.userAddress,
      });
    } catch (error) {
      this.logger.error(`Gas estimation failed: ${error.message}`);
      return BigInt(500000); // Default gas estimate
    }
  }
}
