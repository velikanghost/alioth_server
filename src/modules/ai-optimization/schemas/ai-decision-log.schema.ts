import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AIDecisionLogDocument = AIDecisionLog & Document;

@Schema()
export class InputData {
  @Prop({ required: true })
  inputToken: string;

  @Prop({ required: true })
  inputAmount: string; // BigInt as string

  @Prop({ required: true })
  availableTokens: string[];

  @Prop({ required: true })
  userRiskTolerance: number;

  @Prop()
  userAddress: string;

  @Prop()
  gasPrice: string;

  @Prop({ type: Object, default: {} })
  marketConditions: Record<string, any>;
}

@Schema()
export class AIAnalysis {
  @Prop({ type: Object, required: true })
  marketData: Record<string, any>;

  @Prop({ type: Object, required: true })
  yieldAnalysis: Record<string, any>;

  @Prop({ type: Object, required: true })
  riskAnalysis: Record<string, any>;

  @Prop({ type: Object, required: true })
  recommendedAllocation: Record<string, number>; // token -> percentage

  @Prop({ required: true })
  expectedAPY: number;

  @Prop({ required: true })
  riskScore: number;

  @Prop({ required: true })
  diversificationScore: number;

  @Prop({ type: Object, required: true })
  protocolAllocations: Record<string, Record<string, number>>; // token -> protocol -> percentage

  @Prop()
  reasoning: string; // AI decision reasoning

  @Prop()
  confidence: number; // AI confidence score 0-100

  @Prop({ required: true })
  analysisTimestamp: Date;

  @Prop()
  computationTimeMs: number;
}

@Schema()
export class ExecutionResult {
  @Prop({ required: true })
  executionStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL';

  @Prop()
  transactionHashes: string[];

  @Prop({ type: Object, default: {} })
  actualAllocation: Record<string, number>; // Actual token allocation achieved

  @Prop()
  totalGasUsed: string;

  @Prop()
  totalGasCostUSD: number;

  @Prop({ type: [Object], default: [] })
  swapResults: Record<string, any>[]; // DEX swap details

  @Prop({ type: [Object], default: [] })
  protocolDepositResults: Record<string, any>[]; // Protocol deposit details

  @Prop({ type: Object, default: {} })
  slippageExperienced: Record<string, number>; // token -> slippage %

  @Prop()
  executionTimeMs: number;

  @Prop()
  errorMessage?: string;

  @Prop()
  executionTimestamp: Date;
}

@Schema()
export class PerformanceOutcome {
  @Prop()
  actualAPY: number; // Realized APY after execution

  @Prop()
  actualYieldEarnedUSD: number; // Actual yield earned so far

  @Prop()
  totalFeesUSD: number; // Total fees paid

  @Prop()
  netReturnUSD: number; // Net return after fees

  @Prop()
  portfolioValueChange: number; // % change in portfolio value

  @Prop()
  benchmarkComparison: number; // Performance vs benchmark

  @Prop()
  riskAdjustedReturn: number; // Sharpe ratio or similar

  @Prop()
  lastPerformanceUpdate: Date;
}

@Schema({ timestamps: true })
export class AIDecisionLog {
  @Prop({ required: true })
  operationId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userAddress: string;

  @Prop({
    required: true,
    enum: ['DEPOSIT', 'REBALANCE', 'HARVEST', 'WITHDRAWAL', 'EMERGENCY_EXIT'],
  })
  decisionType: string;

  @Prop({ type: InputData, required: true })
  inputData: InputData;

  @Prop({ type: AIAnalysis, required: true })
  aiAnalysis: AIAnalysis;

  @Prop({ type: ExecutionResult })
  executionResult?: ExecutionResult;

  @Prop({ type: PerformanceOutcome })
  performanceOutcome?: PerformanceOutcome;

  @Prop()
  profitabilityActual?: number; // Actual profitability achieved

  @Prop({ required: true })
  profitabilityPredicted: number; // AI predicted profitability

  @Prop()
  accuracyScore?: number; // How accurate was the prediction (0-100)

  @Prop({ default: 'PENDING' })
  status: 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';

  @Prop()
  aiModelVersion: string; // Version of AI model used

  @Prop()
  strategyVersion: string; // Version of allocation strategy

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>; // Additional tracking data

  @Prop({ default: Date.now })
  decisionTimestamp: Date;

  @Prop()
  executionTimestamp?: Date;

  @Prop()
  settlementTimestamp?: Date; // When final performance was measured

  @Prop({ default: 0 })
  gasUsed: number; // Total gas used for this operation
}

export const AIDecisionLogSchema = SchemaFactory.createForClass(AIDecisionLog);

// Create indexes for analytics and performance queries
AIDecisionLogSchema.index({ operationId: 1 }, { unique: true });
AIDecisionLogSchema.index({ userId: 1 });
AIDecisionLogSchema.index({ userAddress: 1 });
AIDecisionLogSchema.index({ decisionType: 1 });
AIDecisionLogSchema.index({ status: 1 });
AIDecisionLogSchema.index({ userId: 1, decisionType: 1 });
AIDecisionLogSchema.index({ decisionTimestamp: -1 });
AIDecisionLogSchema.index({ status: 1, decisionTimestamp: -1 });
AIDecisionLogSchema.index({ 'aiAnalysis.expectedAPY': -1 });
AIDecisionLogSchema.index({ 'performanceOutcome.actualAPY': -1 });
AIDecisionLogSchema.index({ accuracyScore: -1 });
