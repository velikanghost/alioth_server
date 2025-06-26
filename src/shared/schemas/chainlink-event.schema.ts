import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChainlinkEventDocument = ChainlinkEvent & Document;

@Schema({ timestamps: true })
export class ChainlinkEvent {
  @Prop({
    required: true,
    enum: ['price_validation', 'automation_trigger', 'upkeep_performed'],
    index: true,
  })
  eventType: 'price_validation' | 'automation_trigger' | 'upkeep_performed';

  @Prop({ required: true, index: true })
  transactionHash: string;

  @Prop({ required: true, index: true })
  blockNumber: number;

  @Prop({ index: true })
  optimizationId?: string;

  @Prop({ type: Object, required: true })
  eventData: Record<string, any>;

  // Chain information
  @Prop({ default: 'sepolia' })
  chainName: string;

  @Prop({ default: 11155111 })
  chainId: number;

  // Event source details
  @Prop()
  contractAddress?: string;

  @Prop()
  logIndex?: number;

  @Prop()
  gasUsed?: number;

  @Prop()
  gasPrice?: string;

  // Processing status
  @Prop({
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
    index: true,
  })
  processingStatus: 'pending' | 'processed' | 'failed';

  @Prop()
  processingError?: string;

  @Prop({ type: Date })
  processedAt?: Date;

  // Associated user/optimization
  @Prop({ index: true })
  userAddress?: string;

  @Prop({ index: true })
  trackingId?: string;

  // Automation specific fields
  @Prop()
  automationId?: string;

  @Prop()
  upkeepId?: string;

  @Prop({ type: Object })
  upkeepData?: {
    performedBy?: string;
    gasLimit?: number;
    gasUsed?: number;
    executionTime?: number;
  };

  // Price validation specific fields
  @Prop({ type: Object })
  priceData?: {
    token?: string;
    price?: number;
    confidence?: number;
    source?: string;
    deviationFromExpected?: number;
  };

  // Rebalancing specific fields
  @Prop({ type: Object })
  rebalanceData?: {
    oldAllocations?: Array<{
      protocol: string;
      percentage: number;
    }>;
    newAllocations?: Array<{
      protocol: string;
      percentage: number;
    }>;
    reason?: string;
    triggered_by?: string;
  };

  // Metadata
  @Prop({ type: [String] })
  tags?: string[];

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isArchived: boolean;

  // Performance tracking
  @Prop()
  eventDetectionLatency?: number; // milliseconds

  @Prop()
  processingLatency?: number; // milliseconds
}

export const ChainlinkEventSchema =
  SchemaFactory.createForClass(ChainlinkEvent);

// Indexes for better query performance
ChainlinkEventSchema.index({ eventType: 1, createdAt: -1 });
ChainlinkEventSchema.index({ transactionHash: 1 });
ChainlinkEventSchema.index({ blockNumber: 1, chainId: 1 });
ChainlinkEventSchema.index({ optimizationId: 1 });
ChainlinkEventSchema.index({ userAddress: 1, createdAt: -1 });
ChainlinkEventSchema.index({ trackingId: 1 });
ChainlinkEventSchema.index({ processingStatus: 1 });
ChainlinkEventSchema.index({ automationId: 1 });
ChainlinkEventSchema.index({ 'priceData.token': 1 });

// Compound indexes for common queries
ChainlinkEventSchema.index({
  eventType: 1,
  processingStatus: 1,
  createdAt: -1,
});
ChainlinkEventSchema.index({ userAddress: 1, eventType: 1, createdAt: -1 });

// Methods
ChainlinkEventSchema.methods.markAsProcessed = function () {
  this.processingStatus = 'processed';
  this.processedAt = new Date();
  if (this.createdAt) {
    this.processingLatency = Date.now() - this.createdAt.getTime();
  }
};

ChainlinkEventSchema.methods.markAsFailed = function (error: string) {
  this.processingStatus = 'failed';
  this.processingError = error;
  this.processedAt = new Date();
  if (this.createdAt) {
    this.processingLatency = Date.now() - this.createdAt.getTime();
  }
};

ChainlinkEventSchema.methods.isAutomationEvent = function () {
  return (
    this.eventType === 'automation_trigger' ||
    this.eventType === 'upkeep_performed'
  );
};

ChainlinkEventSchema.methods.isPriceEvent = function () {
  return this.eventType === 'price_validation';
};

ChainlinkEventSchema.methods.getEventAge = function () {
  if (!this.createdAt) return 0;
  return Math.floor((Date.now() - this.createdAt.getTime()) / 1000); // seconds
};

// Static methods
ChainlinkEventSchema.statics.findByOptimization = function (
  optimizationId: string,
) {
  return this.find({ optimizationId }).sort({ createdAt: -1 });
};

ChainlinkEventSchema.statics.findByUser = function (userAddress: string) {
  return this.find({ userAddress }).sort({ createdAt: -1 });
};

ChainlinkEventSchema.statics.findByEventType = function (eventType: string) {
  return this.find({ eventType }).sort({ createdAt: -1 });
};

ChainlinkEventSchema.statics.findPendingEvents = function () {
  return this.find({ processingStatus: 'pending' }).sort({ createdAt: 1 });
};

ChainlinkEventSchema.statics.findRecentEvents = function (hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 });
};

ChainlinkEventSchema.statics.getEventStats = function (timeframe: Date) {
  return this.aggregate([
    { $match: { createdAt: { $gte: timeframe } } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$processingLatency' },
        successRate: {
          $avg: {
            $cond: [{ $eq: ['$processingStatus', 'processed'] }, 1, 0],
          },
        },
      },
    },
  ]);
};

ChainlinkEventSchema.statics.findAutomationEvents = function (
  automationId?: string,
  limit: number = 50,
) {
  const query = {
    eventType: { $in: ['automation_trigger', 'upkeep_performed'] },
    ...(automationId && { automationId }),
  };

  return this.find(query).sort({ createdAt: -1 }).limit(limit);
};

ChainlinkEventSchema.statics.findPriceValidationEvents = function (
  token?: string,
  limit: number = 50,
) {
  const query = {
    eventType: 'price_validation',
    ...(token && { 'priceData.token': token }),
  };

  return this.find(query).sort({ createdAt: -1 }).limit(limit);
};
