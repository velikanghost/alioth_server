import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Web3Service } from './web3.service';
import { CCIP_ABI } from '../../utils/abi';
import { encodeFunctionData } from 'viem';

/**
 * CCIPService
 *
 * Thin wrapper around Chainlink CCIP messenger contract interaction.
 * At the moment it only exposes a `sendMessage` helper and `getFee` utility
 * but can be extended later for retries, status polling, etc.
 */
@Injectable()
export class CCIPService {
  private readonly logger = new Logger(CCIPService.name);
  private readonly messengerAddress: string;

  // Chain-selector mapping (testnets only – extend as needed)
  readonly chainSelectors: Record<string, bigint> = {
    sepolia: 16015286601757825753n,
    baseSepolia: 10344971235874465080n,
    avalancheFuji: 14767482510784806043n,
  };

  constructor(
    private readonly web3Service: Web3Service,
    private readonly configService: ConfigService,
  ) {
    this.messengerAddress = this.configService.get<string>(
      'config.contracts.ccipMessenger',
      '',
    );
    if (!this.messengerAddress) {
      this.logger.warn(
        'CCIP messenger address not configured – CCIPService will be disabled',
      );
    }
  }

  /**
   * Estimate fee for a message (read-only)
   */
  async estimateFee(
    fromChain: string,
    destinationSelector: bigint,
    messageType: number,
    token: `0x${string}`,
    amount: bigint,
    payFeesIn: number = 0,
  ): Promise<bigint> {
    if (!this.messengerAddress) throw new Error('Messenger address missing');
    const contract = this.web3Service.createContract(
      fromChain,
      this.messengerAddress as `0x${string}`,
      CCIP_ABI,
    );
    const fee = (await contract.read.getFee([
      destinationSelector,
      messageType,
      '0x',
      token,
      amount,
      payFeesIn,
    ])) as bigint;
    return fee;
  }

  /**
   * Build calldata for sendMessage (collateral transfer) – can be used with Privy wallets.
   */
  buildSendMessageCalldata(
    destinationSelector: bigint,
    receiver: `0x${string}`,
    token: `0x${string}`,
    amount: bigint,
    payFeesIn: number = 0,
    messageType: number = 3, // COLLATERAL_TRANSFER default
  ): `0x${string}` {
    return encodeFunctionData({
      abi: CCIP_ABI,
      functionName: 'sendMessage',
      args: [
        destinationSelector,
        receiver,
        messageType,
        '0x',
        token,
        amount,
        payFeesIn,
      ],
    }) as `0x${string}`;
  }

  getMessengerAddress(): string {
    return this.messengerAddress;
  }
}
