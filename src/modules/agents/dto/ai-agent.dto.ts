import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { AIDecision } from '../services/alioth-ai-agent.service';

export enum AIMode {
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
  YOLO = 'yolo',
}

export class ChatMessageDto {
  @ApiProperty({
    description: 'Session ID for conversation tracking',
    example: 'session-123',
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Message to send to the AI agent',
    example: 'What are the best yields right now?',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'User wallet address for personalized responses',
    example: '0x742F35Cc8635C0532C81b1e3a7b5CCc0B14A6e86',
  })
  @IsOptional()
  @IsString()
  userAddress?: string;

  @ApiPropertyOptional({
    description: 'Alioth wallet ID to use for portfolio analysis',
    example: '60f5e5c5a5a5a5a5a5a5a5a5',
  })
  @IsOptional()
  @IsString()
  aliothWalletId?: string;

  @ApiPropertyOptional({
    description: 'AI mode for response personality',
    enum: AIMode,
    default: AIMode.BALANCED,
  })
  @IsOptional()
  @IsEnum(AIMode)
  mode?: AIMode;
}

export class InvestmentDecisionDto {
  @ApiProperty({
    description: 'User wallet address',
    example: '0x742F35Cc8635C0532C81b1e3a7b5CCc0B14A6e86',
  })
  @IsString()
  userAddress: string;

  @ApiPropertyOptional({
    description: 'Alioth wallet ID to use for portfolio analysis',
    example: '60f5e5c5a5a5a5a5a5a5a5a5',
  })
  @IsOptional()
  @IsString()
  aliothWalletId?: string;

  @ApiPropertyOptional({
    description: 'AI mode for decision making',
    enum: AIMode,
    default: AIMode.BALANCED,
  })
  @IsOptional()
  @IsEnum(AIMode)
  mode?: AIMode;

  @ApiPropertyOptional({
    description: 'Additional context for decision making',
    example: { portfolioValue: 10000 },
  })
  @IsOptional()
  @IsObject()
  context?: any;
}

export class ExecuteDecisionDto {
  @ApiProperty({
    description: 'User wallet address',
    example: '0x742F35Cc8635C0532C81b1e3a7b5CCc0B14A6e86',
  })
  @IsString()
  userAddress: string;

  @ApiProperty({
    description: 'AI decision to execute',
  })
  @IsObject()
  decision: AIDecision;

  @ApiProperty({
    description: 'User confirmation for execution',
    example: true,
  })
  @IsBoolean()
  userConfirmation: boolean;
}
