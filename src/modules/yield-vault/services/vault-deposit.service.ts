import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrivyService } from '../../../shared/privy/privy.service';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
  TransactionStatus,
} from '../schemas/transaction.schema';
import { DepositDto } from '../dto/vault.dto';
import { VaultTokenService } from './vault-token.service';
import { VaultPortfolioService } from './vault-portfolio.service';
import { Web3Service } from '../../../shared/web3/web3.service';
import { TOKEN_ABI } from '../../../utils/abi';
import { ConfigService } from '@nestjs/config';
import { CCIP_ABI } from '../../../utils/abi';
import { encodeFunctionData } from 'viem';
import {
  VAULT_ADDRESSES,
  CCIP_MESSENGER_ADDRESSES,
} from '../../../utils/addresses';
import { TOKEN_ADDRESS_MAP } from '../../../utils/tokens';

// Interface for multi-chain AI recommendations (matching agent_res.json format)
interface AIRecommendation {
  protocol: string;
  percentage: number;
  expectedAPY: number;
  riskScore: number;
  tvl: number;
  chain: string;
  token: string;
  amount: string;
}

interface MultiChainDepositResult {
  transactions: Transaction[];
  crossChainTransfers: Array<{
    fromChain: string;
    toChain: string;
    amount: string;
    messageId: string;
    transactionHash: string;
  }>;
  totalDepositedUSD: number;
}

@Injectable()
export class VaultDepositService {
  private readonly logger = new Logger(VaultDepositService.name);
  private readonly aliothVaultAddresses = VAULT_ADDRESSES;

  // Mapping of chain names to CCIP chain selectors (testnet)
  private readonly chainSelectors: Record<string, bigint> = {
    sepolia: 16015286601757825753n,
    basesepolia: 10344971235874465080n,
    avalanchefuji: 14767482510784806043n,
  };

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private vaultTokenService: VaultTokenService,
    private vaultPortfolioService: VaultPortfolioService,
    private privyService: PrivyService,
    private web3Service: Web3Service,
    private configService: ConfigService,
  ) {
    // CCIP messenger addresses are now handled via chain-specific mapping
    this.logger.log('VaultDepositService initialized with cross-chain support');
  }

  async deposit(
    userAddress: string,
    depositDto: DepositDto,
    aliothWallet: any,
    aiRecommendations?: AIRecommendation[],
  ): Promise<Transaction | MultiChainDepositResult> {
    this.logger.log(
      `Processing deposit for user ${userAddress}: ${depositDto.amount} of ${depositDto.tokenAddress}`,
    );

    // If AI recommendations include multi-chain allocations, handle them
    if (
      aiRecommendations &&
      this.hasMultiChainAllocations(aiRecommendations, depositDto.chainId)
    ) {
      return this.processMultiChainDeposit(
        userAddress,
        depositDto,
        aliothWallet,
        aiRecommendations,
      );
    }

    // Otherwise, process as single-chain deposit
    return this.processSingleChainDeposit(
      userAddress,
      depositDto,
      aliothWallet,
    );
  }

  private async processMultiChainDeposit(
    userAddress: string,
    depositDto: DepositDto,
    aliothWallet: any,
    aiRecommendations: AIRecommendation[],
  ): Promise<MultiChainDepositResult> {
    this.logger.log(
      `🌉 Processing multi-chain deposit with ${aiRecommendations.length} allocations`,
    );

    const sourceChain = this.getChainNameFromId(depositDto.chainId);
    const transactions: Transaction[] = [];
    const crossChainTransfers: Array<{
      fromChain: string;
      toChain: string;
      amount: string;
      messageId: string;
      transactionHash: string;
    }> = [];

    let totalDepositedUSD = 0;

    try {
      // 1. Process same-chain allocations first
      const sameChainRecommendations = aiRecommendations.filter(
        (rec) => rec.chain.toLowerCase() === sourceChain.toLowerCase(),
      );

      for (const recommendation of sameChainRecommendations) {
        this.logger.log(
          `💰 Processing same-chain allocation: ${recommendation.percentage}% on ${recommendation.chain}`,
        );

        const singleDepositDto = {
          ...depositDto,
          amount: recommendation.amount,
          targetProtocol: recommendation.protocol,
        };

        const transaction = await this.processSingleChainDeposit(
          userAddress,
          singleDepositDto,
          aliothWallet,
        );

        transactions.push(transaction as Transaction);
        totalDepositedUSD += (transaction as Transaction).amountUSD || 0;
      }

      // 2. Process cross-chain allocations
      const crossChainRecommendations = aiRecommendations.filter(
        (rec) => rec.chain.toLowerCase() !== sourceChain.toLowerCase(),
      );

      for (const recommendation of crossChainRecommendations) {
        this.logger.log(
          `🌉 Processing cross-chain allocation: ${recommendation.percentage}% on ${recommendation.chain}`,
        );

        try {
          // Check if Alioth wallet already holds enough tokens on destination chain
          const destChainId = this.getChainIdFromName(recommendation.chain);

          // Get the correct token address for the destination chain
          // Don't use source chain token address as fallback - it must be mapped correctly
          const destTokenAddr =
            TOKEN_ADDRESS_MAP[destChainId]?.[
              recommendation.token.toUpperCase()
            ];

          if (!destTokenAddr) {
            throw new Error(
              `No token address mapping found for ${recommendation.token} on destination chain ${destChainId} (${recommendation.chain})`,
            );
          }

          this.logger.log(
            `🔍 Checking balance of ${recommendation.token} (${destTokenAddr}) on ${recommendation.chain} for ${recommendation.amount}`,
          );

          const balanceInfo = await this.privyService.getWalletBalance(
            aliothWallet.aliothWalletAddress,
            destChainId,
            destTokenAddr,
          );

          this.logger.log(
            `💰 Found ${balanceInfo.raw || '0'} ${recommendation.token} on ${recommendation.chain}, need ${recommendation.amount}`,
          );

          if (BigInt(balanceInfo.raw || '0') >= BigInt(recommendation.amount)) {
            this.logger.log(
              `💡 Sufficient ${recommendation.token} balance found on ${recommendation.chain}. Depositing directly without bridge`,
            );

            // Execute direct deposit on destination chain
            const destDepositDto: DepositDto = {
              ...depositDto,
              chainId: destChainId,
              tokenAddress: destTokenAddr,
              amount: recommendation.amount,
              targetProtocol: recommendation.protocol,
            } as DepositDto;

            try {
              const destTx = await this.processSingleChainDeposit(
                userAddress,
                destDepositDto,
                aliothWallet,
              );

              transactions.push(destTx as Transaction);
              totalDepositedUSD += (destTx as Transaction).amountUSD || 0;

              this.logger.log(
                `✅ Direct deposit completed on ${recommendation.chain} without cross-chain transfer`,
              );
            } catch (destErr) {
              this.logger.error(
                `❌ Direct deposit on ${recommendation.chain} failed: ${destErr.message}`,
              );
              throw destErr;
            }

            continue; // proceed to next recommendation
          }

          // Otherwise, bridge tokens from source chain
          this.logger.log(
            `💸 Insufficient balance on ${recommendation.chain}. Executing cross-chain transfer`,
          );

          // Execute CCIP transfer
          const transferResult = await this.executeCrossChainTransfer(
            aliothWallet,
            depositDto.chainId,
            recommendation.chain,
            depositDto.tokenAddress,
            recommendation.amount,
          );

          crossChainTransfers.push({
            fromChain: sourceChain,
            toChain: recommendation.chain,
            amount: recommendation.amount,
            messageId: transferResult.messageId,
            transactionHash: transferResult.transactionHash,
          });

          // After bridge completes, attempt deposit on destination chain.
          await new Promise((res) => setTimeout(res, 60_000));

          const destDepositDto: DepositDto = {
            ...depositDto,
            chainId: destChainId,
            tokenAddress: this.getTokenAddress(
              destChainId,
              recommendation.token,
              depositDto.tokenAddress,
            ),
            amount: recommendation.amount,
            targetProtocol: recommendation.protocol,
          } as DepositDto;

          try {
            const destTx = await this.processSingleChainDeposit(
              userAddress,
              destDepositDto,
              aliothWallet,
            );

            transactions.push(destTx as Transaction);
            totalDepositedUSD += (destTx as Transaction).amountUSD || 0;
          } catch (destErr) {
            this.logger.warn(
              `Deposit on destination chain ${recommendation.chain} failed (will require retry): ${destErr.message}`,
            );
          }
        } catch (bridgeErr) {
          this.logger.error(
            `⚠️  Cross-chain transfer failed for allocation to ${recommendation.chain}: ${bridgeErr.message}`,
          );
          throw bridgeErr;
        }
      }

      this.logger.log(
        `✅ Multi-chain deposit completed: ${transactions.length} transactions across ${new Set([sourceChain, ...crossChainRecommendations.map((r) => r.chain)]).size} chains`,
      );

      return {
        transactions,
        crossChainTransfers,
        totalDepositedUSD,
      };
    } catch (error) {
      this.logger.error(`❌ Multi-chain deposit failed: ${error.message}`);
      throw error;
    }
  }

  private async processSingleChainDeposit(
    userAddress: string,
    depositDto: DepositDto,
    aliothWallet: any,
  ): Promise<Transaction> {
    let transaction: any;

    try {
      // 1. Validate inputs
      await this.validateDeposit(depositDto);

      // 2. Get user's current shares (before deposit)
      const sharesBefore = await this.vaultPortfolioService.getUserShares(
        aliothWallet.aliothWalletAddress,
        depositDto.tokenAddress,
        depositDto.chainId,
      );

      // 3. Calculate USD value using real Chainlink price and dynamic decimals
      const tokenPriceUSD = await this.vaultTokenService.getTokenPriceUSD(
        depositDto.tokenAddress,
      );

      // Get token decimals for accurate calculation
      const tokenDecimals = await this.vaultTokenService.getTokenDecimals(
        depositDto.tokenAddress,
        depositDto.chainId,
      );

      // Convert amount to decimal using actual token decimals
      const tokenAmount =
        parseFloat(depositDto.amount) / Math.pow(10, tokenDecimals);
      const amountUSD = tokenAmount * tokenPriceUSD;

      this.logger.log(
        `💰 Price calculation: ${tokenAmount.toFixed(6)} tokens × $${tokenPriceUSD.toFixed(2)} = $${amountUSD.toFixed(2)} USD`,
      );

      // 4. Create transaction record
      transaction = new this.transactionModel({
        userAddress,
        chainId: depositDto.chainId,
        type: TransactionType.DEPOSIT,
        tokenAddress: depositDto.tokenAddress,
        tokenSymbol: await this.vaultTokenService.getTokenSymbol(
          depositDto.tokenAddress,
          depositDto.chainId,
        ),
        amount: depositDto.amount,
        amountUSD,
        status: TransactionStatus.PENDING,
        timestamp: new Date(),
        initiatedBy: 'user',
        shares: {
          sharesBefore,
          sharesAfter: sharesBefore, // Will update after confirmation
          sharesDelta: '0', // Will update after confirmation
        },
      });

      await transaction.save();
      this.logger.log(`Created transaction record: ${transaction._id}`);

      // 5. Execute deposit on smart contract
      const executionResult = await this.executeDeposit(
        userAddress,
        depositDto,
        aliothWallet,
        this.normalizeProtocol(depositDto.targetProtocol || 'aave'),
      );

      // 6. Wait for transaction confirmation using viem
      this.logger.log(`Transaction submitted: ${executionResult}`);
      const chainName = this.getChainName(depositDto.chainId);
      const publicClient = this.web3Service.getClient(chainName);

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: executionResult as `0x${string}`,
        timeout: 60000, // 60 second timeout
      });

      if (receipt.status !== 'success') {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      this.logger.log(
        `✅ Transaction confirmed in block ${receipt.blockNumber}`,
      );

      // 7. Get updated shares from contract after confirmation
      const sharesAfter = await this.vaultPortfolioService.getUserShares(
        aliothWallet.aliothWalletAddress,
        depositDto.tokenAddress,
        depositDto.chainId,
      );

      const sharesDelta = (
        BigInt(sharesAfter) - BigInt(sharesBefore)
      ).toString();

      // 8. Update transaction with confirmed data
      transaction.txHash = executionResult;
      transaction.status = TransactionStatus.CONFIRMED;
      transaction.confirmedAt = new Date();
      transaction.gasUsed = Number(receipt.gasUsed); // Real gas usage from receipt
      transaction.shares = {
        sharesBefore,
        sharesAfter,
        sharesDelta,
      };

      this.logger.log(
        `✅ Deposit confirmed: ${sharesBefore} -> ${sharesAfter} shares (+${sharesDelta}), Gas: ${receipt.gasUsed}`,
      );

      await transaction.save();

      this.logger.log(`✅ Deposit process completed: ${transaction.txHash}`);
      return transaction;
    } catch (error) {
      this.logger.error(`❌ Deposit failed for user ${userAddress}:`, error);

      // Update transaction status to failed if transaction was created
      if (transaction && transaction._id) {
        transaction.status = TransactionStatus.FAILED;
        transaction.error = {
          message: error.message,
          code: error.code || 'DEPOSIT_FAILED',
        };
        await transaction.save();
      }

      throw error;
    }
  }

  private hasMultiChainAllocations(
    recommendations: AIRecommendation[],
    sourceChainId: number,
  ): boolean {
    const sourceChain = this.getChainNameFromId(sourceChainId);
    return recommendations.some(
      (rec) => rec.chain.toLowerCase() !== sourceChain.toLowerCase(),
    );
  }

  private getChainNameFromId(chainId: number): string {
    switch (chainId) {
      case 11155111:
        return 'sepolia';
      case 84532:
        return 'baseSepolia';
      case 43113:
        return 'avalancheFuji';
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  }

  /**
   * Helper: convert chain name (sepolia, baseSepolia, avalancheFuji) to numeric chainId
   */
  private getChainIdFromName(chainName: string): number {
    switch (chainName.toLowerCase()) {
      case 'sepolia':
        return 11155111;
      case 'basesepolia':
      case 'base-sepolia':
        return 84532;
      case 'avalanchefuji':
      case 'avalanche-fuji':
      case 'fujitestnet':
        return 43113;
      default:
        throw new Error(`Unsupported chain name: ${chainName}`);
    }
  }

  private async validateDeposit(depositDto: DepositDto): Promise<void> {
    // Check if amount is valid
    if (BigInt(depositDto.amount) <= 0) {
      throw new BadRequestException('Deposit amount must be greater than 0');
    }

    // Check if token is supported by vault
    const isTokenSupported = await this.vaultPortfolioService.isTokenSupported(
      depositDto.tokenAddress,
      depositDto.chainId,
    );

    if (!isTokenSupported) {
      throw new BadRequestException(
        `Token ${depositDto.tokenAddress} is not supported by the vault. Please add it to the vault's supported tokens list first.`,
      );
    }

    // Check emergency stop
    const isEmergencyStop = await this.vaultPortfolioService.isEmergencyStop(
      depositDto.chainId,
    );
    if (isEmergencyStop) {
      throw new BadRequestException(
        'Deposits are currently paused due to emergency stop',
      );
    }

    // TODO: Add more validations
    // - Check supply caps
    // - Check user balance and allowance
  }

  private async checkAndApproveTokens(
    userAddress: string,
    depositDto: DepositDto,
    aliothWallet: any,
  ): Promise<void> {
    try {
      // 1. Get token contract
      const chainName = this.getChainName(depositDto.chainId);
      const tokenContract = this.web3Service.createContract(
        chainName,
        depositDto.tokenAddress as `0x${string}`,
        TOKEN_ABI,
      );

      // 2. Check current allowance
      const vaultAddress = this.getVaultAddress(depositDto.chainId);
      const allowance = (await tokenContract.read.allowance([
        aliothWallet.aliothWalletAddress as `0x${string}`,
        vaultAddress,
      ])) as bigint;

      const depositAmount = BigInt(depositDto.amount);

      // Ensure the Alioth wallet has enough token balance
      const balance = await this.privyService.getWalletBalance(
        aliothWallet.aliothWalletAddress,
        depositDto.chainId,
        depositDto.tokenAddress,
      );

      if (BigInt(balance?.raw || '0') < depositAmount) {
        throw new BadRequestException(
          `Insufficient ${depositDto.tokenAddress} balance in Alioth wallet. Available: ${balance?.raw || '0'}, Required: ${depositDto.amount}`,
        );
      }

      // 3. If allowance is insufficient, execute approval
      if (allowance < depositAmount) {
        this.logger.log(
          `Insufficient allowance (${allowance} < ${depositAmount}). Executing approval...`,
        );

        // Execute approval transaction
        const txHash = await this.privyService.ensureTokenApproval(
          aliothWallet.privyWalletId,
          aliothWallet.aliothWalletAddress,
          depositDto.tokenAddress,
          vaultAddress,
          depositDto.amount,
          depositDto.chainId,
        );

        // Wait for approval confirmation
        const chainName = this.getChainName(depositDto.chainId);
        const publicClient = this.web3Service.getClient(chainName);
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          timeout: 60000, // 60 second timeout
        });

        if (receipt.status !== 'success') {
          throw new Error('Token approval failed');
        }

        this.logger.log(`✅ Token approval confirmed: ${txHash}`);
      } else {
        this.logger.log('Token already approved for deposit amount');
      }
    } catch (error) {
      this.logger.error('Failed to check/approve tokens:', error);
      throw new BadRequestException(`Token approval failed: ${error.message}`);
    }
  }

  private async executeDeposit(
    userAddress: string,
    depositDto: DepositDto,
    aliothWallet: any,
    targetProtocol: string,
  ): Promise<string> {
    try {
      // Calculate minimum shares (apply 0.5% slippage protection)
      const minShares =
        (BigInt(depositDto.amount) * BigInt(995)) / BigInt(1000);

      const chainName = this.getChainName(depositDto.chainId);
      const vaultAddress = this.getVaultAddress(depositDto.chainId);

      let txHash: string;

      // Execute deposit transaction via Privy-managed Alioth wallet
      txHash = await this.privyService.executeVaultDeposit(
        aliothWallet.privyWalletId,
        vaultAddress,
        depositDto.tokenAddress,
        depositDto.amount,
        minShares.toString(),
        depositDto.chainId,
        targetProtocol, // Pass the target protocol
      );

      this.logger.log(`✅ Privy vault deposit transaction executed: ${txHash}`);

      if (txHash) {
        return txHash;
      } else {
        throw new BadRequestException(
          'Deposit failed: Transaction hash is null',
        );
      }
    } catch (error) {
      this.logger.error(`Deposit execution failed: ${error.message}`);
      throw new BadRequestException(`Deposit failed: ${error.message}`);
    }
  }

  private normalizeProtocol(protocol: string): string {
    // Normalize protocol names to match vault contract expectations
    const protocolMap: Record<string, string> = {
      'compound-v3': 'compound',
      'aave-v3': 'aave',
      'yearn-v3': 'yearn',
    };

    return protocolMap[protocol.toLowerCase()] || protocol.toLowerCase();
  }

  private getChainName(chainId: number): string {
    const chainMap: { [key: number]: string } = {
      11155111: 'sepolia', // Ethereum Sepolia testnet
      84532: 'baseSepolia', // Base Sepolia testnet
      43113: 'avalancheFuji', // Avalanche Fuji testnet
    };

    const chainName = chainMap[chainId];
    if (!chainName) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    return chainName;
  }

  private getVaultAddress(chainId: number): `0x${string}` {
    const addr = this.aliothVaultAddresses[chainId];
    if (!addr) {
      throw new Error(
        `No Alioth Vault address configured for chain ${chainId}`,
      );
    }
    return addr;
  }

  private getTokenAddress(
    chainId: number,
    symbol: string,
    fallback: string,
  ): `0x${string}` {
    const upperSymbol = symbol.toUpperCase();
    const addr = TOKEN_ADDRESS_MAP[chainId]?.[upperSymbol];
    if (addr) {
      return addr as `0x${string}`;
    }
    this.logger.warn(
      `⚠️ Token address for symbol ${upperSymbol} not found on chain ${chainId}. Fallback used: ${fallback}`,
    );
    if (!fallback) {
      throw new Error(
        `No token address found for symbol ${upperSymbol} on chain ${chainId}, and no fallback provided.`,
      );
    }
    return fallback as `0x${string}`;
  }

  /**
   * Execute a cross-chain token transfer using Chainlink CCIP Messenger.
   * Returns messageId (if parsable) and the originating transaction hash.
   */
  private async executeCrossChainTransfer(
    aliothWallet: any,
    fromChainId: number,
    destinationChainName: string,
    tokenAddress: string,
    amount: string,
  ): Promise<{ messageId: string; transactionHash: string }> {
    // Get chain-specific CCIP messenger address
    const ccipMessengerAddress = CCIP_MESSENGER_ADDRESSES[fromChainId];
    if (!ccipMessengerAddress) {
      throw new Error(
        `CCIP messenger address not configured for chain ${fromChainId}`,
      );
    }

    const fromChainName = this.getChainNameFromId(fromChainId);

    // Always use the correct token address for the source chain (fromChainId)
    // If bridging, the token must be the source chain's version of the token
    const fromTokenAddr = this.getTokenAddress(
      fromChainId,
      'USDC',
      tokenAddress,
    );

    this.logger.log(
      `🌉 Executing CCIP transfer: ${amount} ${fromTokenAddr} from ${fromChainName} to ${destinationChainName}`,
    );

    // 1. Ensure messenger is approved to move the tokens (on source chain)
    await this.privyService.ensureTokenApproval(
      aliothWallet.privyWalletId,
      aliothWallet.aliothWalletAddress,
      fromTokenAddr,
      ccipMessengerAddress,
      amount,
      fromChainId,
    );

    // 2. Compute fee by calling getFee on messenger (read-only)
    const messengerContract = this.web3Service.createContract(
      fromChainName,
      ccipMessengerAddress as `0x${string}`,
      CCIP_ABI,
    );

    const destinationSelector =
      this.chainSelectors[destinationChainName.toLowerCase()];
    if (!destinationSelector) {
      throw new Error(
        `Unsupported destination chain: ${destinationChainName}. Available: ${Object.keys(this.chainSelectors).join(', ')}`,
      );
    }

    const messageType = 3; // COLLATERAL_TRANSFER
    const payFeesIn = 0; // Native

    let fee: bigint;
    try {
      fee = (await messengerContract.read.getFee([
        destinationSelector,
        messageType,
        '0x',
        fromTokenAddr,
        BigInt(amount),
        payFeesIn,
      ])) as bigint;
    } catch (err) {
      this.logger.error('Failed to estimate CCIP fee:', err);
      throw new Error(`CCIP fee estimation failed: ${err.message}`);
    }

    this.logger.log(`🧮 Estimated CCIP fee: ${fee} wei`);

    // 3. Check if wallet has enough native tokens to pay the fee
    const nativeBalance = await this.privyService.getWalletBalance(
      aliothWallet.aliothWalletAddress,
      fromChainId,
      'native',
    );

    if (BigInt(nativeBalance.raw || '0') < fee) {
      throw new Error(
        `Insufficient native token balance to pay CCIP fee. Required: ${fee}, Available: ${nativeBalance.raw || '0'}`,
      );
    }

    // 4. Build calldata for sendMessage
    const sendMessageData = encodeFunctionData({
      abi: CCIP_ABI,
      functionName: 'sendMessage',
      args: [
        destinationSelector,
        aliothWallet.aliothWalletAddress as `0x${string}`,
        messageType,
        '0x', // no extra data
        fromTokenAddr,
        BigInt(amount),
        payFeesIn,
      ],
    });

    // 5. Execute the transaction from the alioth wallet paying the fee in native
    const txHash = await this.privyService.executeTransfer(
      aliothWallet.privyWalletId,
      ccipMessengerAddress,
      'native',
      fee.toString(),
      fromChainId,
      sendMessageData as `0x${string}`,
    );

    this.logger.log(`🚀 CCIP transfer transaction submitted: ${txHash}`);

    // Wait for confirmation (non-blocking for messageId extraction)
    try {
      const publicClient = this.web3Service.getClient(fromChainName);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        timeout: 300_000,
      });

      if (receipt.status !== 'success') {
        throw new Error(`CCIP transfer transaction failed: ${receipt.status}`);
      }

      this.logger.log(
        `✅ CCIP transfer confirmed in block ${receipt.blockNumber}`,
      );
    } catch (err) {
      this.logger.error(`CCIP tx confirmation failed: ${err.message}`);
      throw new Error(`CCIP transfer failed: ${err.message}`);
    }

    return { messageId: '', transactionHash: txHash };
  }
}
