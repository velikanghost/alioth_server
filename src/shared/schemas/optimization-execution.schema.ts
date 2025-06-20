import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  AllocationStrategy,
  PerformanceMetrics,
} from '../../modules/ai-optimization/dto/optimization.dto';

export type OptimizationExecutionDocument = OptimizationExecution & Document;

export interface YieldAnalysisResponseData {
  allocation: AllocationStrategy[];
  confidence: number;
  reasoning: string;
  marketAnalysis: any;
}

@Schema({ timestamps: true })
export class OptimizationExecution {
  @Prop({ required: true, index: true })
  userAddress: string;

  @Prop({ required: true })
  inputToken: string;

  @Prop({ required: true })
  inputAmount: string;

  @Prop({ required: true, type: Object })
  strategy: AllocationStrategy[];

  @Prop({ required: true, index: true })
  transactionHash: string;

  @Prop({
    required: true,
    enum: ['pending', 'executed', 'failed'],
    default: 'pending',
    index: true,
  })
  status: 'pending' | 'executed' | 'failed';

  @Prop({ index: true })
  chainlinkAutomationId?: string;

  @Prop({ type: Object })
  aiRecommendation?: YieldAnalysisResponseData;

  @Prop({ type: Object })
  actualPerformance?: PerformanceMetrics;

  @Prop({ required: true, unique: true, index: true })
  trackingId: string;

  @Prop()
  riskTolerance: string;

  @Prop()
  minYieldThreshold?: number;

  @Prop()
  estimatedAPY: number;

  @Prop()
  blockNumber?: number;

  @Prop()
  gasUsed?: number;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  contractParams?: {
    maxSlippage: number;
    deadline: number;
    gasPrice?: string;
  };

  // Real-time updates
  @Prop({ type: Date })
  executedAt?: Date;

  @Prop({ type: Date })
  lastPerformanceUpdate?: Date;

  @Prop({ type: Date })
  nextRebalanceDate?: Date;

  // Automation tracking
  @Prop({ default: false })
  automationRegistered: boolean;

  @Prop()
  automationUpkeepId?: string;

  @Prop({ type: [Object] })
  rebalanceHistory?: Array<{
    timestamp: Date;
    oldAllocations: AllocationStrategy[];
    newAllocations: AllocationStrategy[];
    reason: string;
    transactionHash: string;
  }>;

  // Performance tracking
  @Prop({ type: Object })
  performanceHistory?: Array<{
    timestamp: Date;
    totalValue: number;
    totalReturn: number;
    apy: number;
    riskScore: number;
  }>;

  // AI analysis metadata
  @Prop()
  aiAgentVersion?: string;

  @Prop()
  aiAnalysisConfidence?: number;

  @Prop({ type: Object })
  marketDataSnapshot?: Record<string, any>;

  // Demo and testing
  @Prop({ default: false })
  isDemoExecution: boolean;

  @Prop({ type: [String] })
  tags?: string[];

  @Prop()
  notes?: string;
}

export const OptimizationExecutionSchema = SchemaFactory.createForClass(
  OptimizationExecution,
);

// Indexes for better query performance
OptimizationExecutionSchema.index({ userAddress: 1, status: 1 });
OptimizationExecutionSchema.index({ trackingId: 1 }, { unique: true });
OptimizationExecutionSchema.index({ transactionHash: 1 });
OptimizationExecutionSchema.index({ createdAt: -1 });
OptimizationExecutionSchema.index({ chainlinkAutomationId: 1 });
OptimizationExecutionSchema.index({ 'aiRecommendation.confidence': -1 });

// Virtual for age calculation
OptimizationExecutionSchema.virtual('ageInHours').get(function (this: any) {
  return Math.floor(
    (Date.now() - this.createdAt?.getTime()) / (1000 * 60 * 60),
  );
});

// Methods
OptimizationExecutionSchema.methods.updatePerformance = function (
  metrics: PerformanceMetrics,
) {
  this.actualPerformance = metrics;
  this.lastPerformanceUpdate = new Date();

  if (!this.performanceHistory) {
    this.performanceHistory = [];
  }

  this.performanceHistory.push({
    timestamp: new Date(),
    ...metrics,
  });

  // Keep only last 100 performance records
  if (this.performanceHistory.length > 100) {
    this.performanceHistory = this.performanceHistory.slice(-100);
  }
};

OptimizationExecutionSchema.methods.addRebalance = function (
  oldAllocations: AllocationStrategy[],
  newAllocations: AllocationStrategy[],
  reason: string,
  transactionHash: string,
) {
  if (!this.rebalanceHistory) {
    this.rebalanceHistory = [];
  }

  this.rebalanceHistory.push({
    timestamp: new Date(),
    oldAllocations,
    newAllocations,
    reason,
    transactionHash,
  });

  // Update strategy to new allocations
  this.strategy = newAllocations;
};

OptimizationExecutionSchema.methods.markAsExecuted = function (
  transactionHash: string,
  blockNumber?: number,
  gasUsed?: number,
) {
  this.status = 'executed';
  this.transactionHash = transactionHash;
  this.executedAt = new Date();
  this.blockNumber = blockNumber;
  this.gasUsed = gasUsed;
};

OptimizationExecutionSchema.methods.markAsFailed = function (
  errorMessage: string,
) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
};

// Static methods
OptimizationExecutionSchema.statics.findByUser = function (
  userAddress: string,
) {
  return this.find({ userAddress }).sort({ createdAt: -1 });
};

OptimizationExecutionSchema.statics.findActiveOptimizations = function () {
  return this.find({ status: 'executed' }).sort({ createdAt: -1 });
};

OptimizationExecutionSchema.statics.findByTrackingId = function (
  trackingId: string,
) {
  return this.findOne({ trackingId });
};

OptimizationExecutionSchema.statics.getPerformanceStats = function (
  userAddress?: string,
) {
  const match = userAddress
    ? { userAddress, status: 'executed' }
    : { status: 'executed' };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalExecutions: { $sum: 1 },
        averageAPY: { $avg: '$estimatedAPY' },
        totalValue: { $sum: { $toDouble: '$inputAmount' } },
        averageConfidence: { $avg: '$aiAnalysisConfidence' },
      },
    },
  ]);
};
