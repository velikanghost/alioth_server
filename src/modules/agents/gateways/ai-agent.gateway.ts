import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AliothAIAgentService } from '../services/alioth-ai-agent.service';

interface ConnectedClient {
  id: string;
  userAddress?: string;
  mode: 'conservative' | 'balanced' | 'aggressive' | 'yolo';
  sessionId: string;
  connectedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ai-agent',
})
export class AIAgentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AIAgentGateway.name);
  private connectedClients: Map<string, ConnectedClient> = new Map();

  constructor(private readonly aiAgentService: AliothAIAgentService) {}

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);

    const sessionId = `session-${client.id}-${Date.now()}`;

    const clientInfo: ConnectedClient = {
      id: client.id,
      mode: 'balanced',
      sessionId,
      connectedAt: new Date(),
    };

    this.connectedClients.set(client.id, clientInfo);

    // Send welcome message
    client.emit('welcome', {
      message:
        "👋 Welcome! I'm Alioth, your AI DeFi optimization specialist. How can I help you today?",
      sessionId,
      availableModes: ['conservative', 'balanced', 'aggressive', 'yolo'],
      currentMode: 'balanced',
    });

    // Send current market insights
    this.sendMarketInsights(client.id);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('chat')
  async handleChatMessage(
    @MessageBody() data: { message: string; userAddress?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        client.emit('error', { message: 'Client not found' });
        return;
      }

      this.logger.log(
        `💬 Processing chat message: "${data.message}" from ${client.id}`,
      );

      // Update user address if provided
      if (data.userAddress && !clientInfo.userAddress) {
        clientInfo.userAddress = data.userAddress;
        this.connectedClients.set(client.id, clientInfo);
      }

      const response = await this.aiAgentService.processChatMessage(
        clientInfo.sessionId,
        data.message,
        clientInfo.userAddress,
        clientInfo.mode,
      );

      client.emit('chat_response', {
        message: data.message,
        response,
        mode: clientInfo.mode,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`❌ Chat message processing failed: ${error.message}`);
      client.emit('error', {
        message: 'Failed to process your message. Please try again.',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('set_mode')
  async handleSetMode(
    @MessageBody()
    data: { mode: 'conservative' | 'balanced' | 'aggressive' | 'yolo' },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        client.emit('error', { message: 'Client not found' });
        return;
      }

      this.logger.log(
        `🎯 Setting mode to ${data.mode} for client ${client.id}`,
      );

      clientInfo.mode = data.mode;
      this.connectedClients.set(client.id, clientInfo);

      // Get mode-specific welcome message
      const modeMessages = {
        conservative:
          '🛡️ Conservative mode activated. Focusing on capital preservation with blue-chip protocols.',
        balanced:
          '📊 Balanced mode activated. Optimizing for risk-adjusted returns with strategic diversification.',
        aggressive:
          '⚡ Aggressive mode activated. Pursuing higher yields with calculated risks and active monitoring.',
        yolo: "🔥 YOLO mode activated! Ready for maximum yield hunting regardless of risk. Let's chase those moon yields!",
      };

      client.emit('mode_changed', {
        mode: data.mode,
        message: modeMessages[data.mode],
        timestamp: new Date(),
      });

      // Send mode-specific market insights
      await this.sendMarketInsights(client.id);
    } catch (error) {
      this.logger.error(`❌ Mode setting failed: ${error.message}`);
      client.emit('error', {
        message: 'Failed to set mode. Please try again.',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('get_decision')
  async handleGetDecision(
    @MessageBody()
    data: { userAddress: string; context?: any; aliothWalletId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        client.emit('error', { message: 'Client not found' });
        return;
      }

      this.logger.log(
        `🧠 Generating decision for ${data.userAddress} in ${clientInfo.mode} mode${data.aliothWalletId ? ` using Alioth wallet ${data.aliothWalletId}` : ''}`,
      );

      const decision = await this.aiAgentService.makeInvestmentDecision(
        data.userAddress,
        clientInfo.mode,
        data.context,
        data.aliothWalletId,
      );

      client.emit('decision_ready', {
        decision,
        mode: clientInfo.mode,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`❌ Decision generation failed: ${error.message}`);
      client.emit('error', {
        message: 'Failed to generate decision. Please try again.',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('execute_decision')
  async handleExecuteDecision(
    @MessageBody()
    data: {
      userAddress: string;
      decision: any;
      userConfirmation: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!data.userConfirmation) {
        client.emit('error', {
          message: 'User confirmation is required to execute decisions',
        });
        return;
      }

      this.logger.log(`🚀 Executing decision for ${data.userAddress}`);

      const result = await this.aiAgentService.executeDecision(
        data.userAddress,
        data.decision,
        data.userConfirmation,
      );

      client.emit('decision_executed', {
        result,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`❌ Decision execution failed: ${error.message}`);
      client.emit('error', {
        message: 'Failed to execute decision. Please try again.',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('get_insights')
  async handleGetInsights(@ConnectedSocket() client: Socket) {
    await this.sendMarketInsights(client.id);
  }

  @SubscribeMessage('subscribe_to_alerts')
  async handleSubscribeToAlerts(
    @MessageBody() data: { userAddress: string; alertTypes: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        client.emit('error', { message: 'Client not found' });
        return;
      }

      this.logger.log(
        `🔔 Subscribing ${data.userAddress} to alerts: ${data.alertTypes.join(', ')}`,
      );

      client.emit('alerts_subscribed', {
        userAddress: data.userAddress,
        alertTypes: data.alertTypes,
        message: 'Successfully subscribed to real-time alerts',
        timestamp: new Date(),
      });

      // In production, you would store this subscription info
      // and use it to send targeted alerts
    } catch (error) {
      this.logger.error(`❌ Alert subscription failed: ${error.message}`);
      client.emit('error', {
        message: 'Failed to subscribe to alerts. Please try again.',
        error: error.message,
      });
    }
  }

  // Broadcast methods for sending updates to multiple clients
  async broadcastMarketAlert(alert: {
    type: 'opportunity' | 'risk' | 'gas' | 'protocol';
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    data?: any;
  }) {
    this.logger.log(`📢 Broadcasting market alert: ${alert.title}`);

    this.server.emit('market_alert', {
      ...alert,
      timestamp: new Date(),
    });
  }

  async broadcastToUser(userAddress: string, event: string, data: any) {
    for (const [clientId, clientInfo] of this.connectedClients) {
      if (clientInfo.userAddress === userAddress) {
        this.server.to(clientId).emit(event, {
          ...data,
          timestamp: new Date(),
        });
      }
    }
  }

  async broadcastToMode(mode: string, event: string, data: any) {
    for (const [clientId, clientInfo] of this.connectedClients) {
      if (clientInfo.mode === mode) {
        this.server.to(clientId).emit(event, {
          ...data,
          timestamp: new Date(),
        });
      }
    }
  }

  // Private helper methods
  private async sendMarketInsights(clientId: string) {
    try {
      const clientInfo = this.connectedClients.get(clientId);
      if (!clientInfo) return;

      const insights = await this.aiAgentService.getMarketInsights(
        clientInfo.mode,
      );

      this.server.to(clientId).emit('market_insights', {
        insights,
        mode: clientInfo.mode,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`❌ Failed to send market insights: ${error.message}`);
    }
  }

  // Scheduled method to send periodic updates (would be called by a scheduler)
  async sendPeriodicUpdates() {
    if (this.connectedClients.size === 0) return;

    try {
      // Get insights for each mode
      const modes = ['conservative', 'balanced', 'aggressive', 'yolo'] as const;

      for (const mode of modes) {
        const insights = await this.aiAgentService.getMarketInsights(mode);

        // Send to all clients using this mode
        await this.broadcastToMode(mode, 'periodic_update', {
          insights,
          message: `📊 Market update for ${mode} mode`,
        });
      }

      this.logger.log(
        `📊 Sent periodic updates to ${this.connectedClients.size} clients`,
      );
    } catch (error) {
      this.logger.error(`❌ Failed to send periodic updates: ${error.message}`);
    }
  }

  // Method to get connection statistics
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      modeDistribution: {
        conservative: 0,
        balanced: 0,
        aggressive: 0,
        yolo: 0,
      },
      connectionsWithWallet: 0,
      averageSessionDuration: 0,
    };

    let totalDuration = 0;

    for (const clientInfo of this.connectedClients.values()) {
      stats.modeDistribution[clientInfo.mode]++;
      if (clientInfo.userAddress) stats.connectionsWithWallet++;
      totalDuration += Date.now() - clientInfo.connectedAt.getTime();
    }

    if (this.connectedClients.size > 0) {
      stats.averageSessionDuration = Math.round(
        totalDuration / this.connectedClients.size / 1000,
      ); // seconds
    }

    return stats;
  }
}
