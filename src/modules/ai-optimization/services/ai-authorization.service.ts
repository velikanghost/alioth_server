import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface AIAuthRequest {
  userId: string;
  operation: string;
  parameters: any;
  timestamp: number;
  signature?: string;
}

export interface AuthorizationResult {
  authorized: boolean;
  userId: string;
  permissions: string[];
  rateLimit: {
    remaining: number;
    resetTime: number;
  };
  reason?: string;
}

export interface UserPermissions {
  canOptimizeDeposits: boolean;
  canExecuteSwaps: boolean;
  canAccessMarketData: boolean;
  canModifyPortfolio: boolean;
  maxDepositAmount: bigint;
  maxSlippageTolerance: number;
  allowedTokens: string[];
  rateLimit: {
    requestsPerHour: number;
    executionsPerDay: number;
  };
}

export interface SecurityValidation {
  isValidSignature: boolean;
  isTimestampValid: boolean;
  isOperationAllowed: boolean;
  isPriceAnchorValid: boolean;
  riskScore: number;
  warnings: string[];
}

@Injectable()
export class AIAuthorizationService {
  private readonly logger = new Logger(AIAuthorizationService.name);

  // Rate limiting storage (in production, use Redis)
  private readonly rateLimitStorage: Map<
    string,
    {
      hourlyRequests: number;
      dailyExecutions: number;
      lastHourReset: number;
      lastDayReset: number;
    }
  > = new Map();

  // Security settings
  private readonly SIGNATURE_TIMEOUT = 300000; // 5 minutes
  private readonly MAX_RISK_SCORE = 8; // Out of 10
  private readonly PRICE_ANCHOR_THRESHOLD = 0.05; // 5% price deviation

  // AI backend wallet address (in production, use secure key management)
  private readonly AI_BACKEND_ADDRESS =
    '0x742d35Cc6634C0532925a3b8D020E94cb4734567';

  constructor(private configService: ConfigService) {}

  async authorizeOperation(
    request: AIAuthRequest,
  ): Promise<AuthorizationResult> {
    this.logger.log(
      `Authorizing operation: ${request.operation} for user: ${request.userId}`,
    );

    try {
      // 1. Validate the request signature
      const signatureValidation = await this.validateSignature(request);
      if (!signatureValidation.isValidSignature) {
        return {
          authorized: false,
          userId: request.userId,
          permissions: [],
          rateLimit: { remaining: 0, resetTime: Date.now() + 3600000 },
          reason: 'Invalid signature',
        };
      }

      // 2. Check user permissions
      const userPermissions = await this.getUserPermissions(request.userId);
      const operationAllowed = this.isOperationAllowed(
        request.operation,
        userPermissions,
      );

      if (!operationAllowed) {
        return {
          authorized: false,
          userId: request.userId,
          permissions: this.getPermissionsList(userPermissions),
          rateLimit: { remaining: 0, resetTime: Date.now() + 3600000 },
          reason: 'Operation not permitted for this user',
        };
      }

      // 3. Check rate limits
      const rateLimitCheck = this.checkRateLimit(
        request.userId,
        request.operation,
        userPermissions,
      );
      if (!rateLimitCheck.allowed) {
        return {
          authorized: false,
          userId: request.userId,
          permissions: this.getPermissionsList(userPermissions),
          rateLimit: rateLimitCheck,
          reason: 'Rate limit exceeded',
        };
      }

      // 4. Perform security validation
      const securityValidation = await this.performSecurityValidation(request);
      if (securityValidation.riskScore > this.MAX_RISK_SCORE) {
        return {
          authorized: false,
          userId: request.userId,
          permissions: this.getPermissionsList(userPermissions),
          rateLimit: rateLimitCheck,
          reason: `High risk score: ${securityValidation.riskScore}/10`,
        };
      }

      // 5. Update rate limits
      this.updateRateLimit(request.userId, request.operation);

      // 6. Log successful authorization
      this.logger.log(
        `Operation authorized for user ${request.userId}: ${request.operation}`,
      );

      return {
        authorized: true,
        userId: request.userId,
        permissions: this.getPermissionsList(userPermissions),
        rateLimit: rateLimitCheck,
      };
    } catch (error) {
      this.logger.error(
        `Authorization failed for user ${request.userId}: ${error.message}`,
      );
      throw new UnauthorizedException(`Authorization failed: ${error.message}`);
    }
  }

  async validateAIBackendSignature(
    operation: string,
    parameters: any,
    signature: string,
  ): Promise<boolean> {
    this.logger.log(
      `Validating AI backend signature for operation: ${operation}`,
    );

    try {
      // Create the message to be signed
      const message = this.createSignatureMessage(operation, parameters);

      // In production, use actual cryptographic signature verification
      // For now, simulate signature validation
      const expectedSignature = this.generateMockSignature(message);

      const isValid = signature === expectedSignature;

      if (!isValid) {
        this.logger.warn(
          `Invalid AI backend signature for operation: ${operation}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        `AI backend signature validation failed: ${error.message}`,
      );
      return false;
    }
  }

  async validatePriceAnchor(tokenPrices: Record<string, number>): Promise<{
    isValid: boolean;
    deviations: Record<string, number>;
    warnings: string[];
  }> {
    this.logger.log('Validating price anchor against Chainlink feeds');

    try {
      const deviations: Record<string, number> = {};
      const warnings: string[] = [];
      let isValid = true;

      // Mock Chainlink prices for validation
      const chainlinkPrices: Record<string, number> = {
        AAVE: 85.5,
        WETH: 2300.0,
        WBTC: 42000.0,
        LINK: 12.5,
      };

      for (const [token, price] of Object.entries(tokenPrices)) {
        const chainlinkPrice = chainlinkPrices[token];
        if (chainlinkPrice) {
          const deviation = Math.abs(price - chainlinkPrice) / chainlinkPrice;
          deviations[token] = deviation;

          if (deviation > this.PRICE_ANCHOR_THRESHOLD) {
            isValid = false;
            warnings.push(
              `Price deviation for ${token}: ${(deviation * 100).toFixed(2)}% (${price} vs ${chainlinkPrice})`,
            );
          }
        }
      }

      return { isValid, deviations, warnings };
    } catch (error) {
      this.logger.error(`Price anchor validation failed: ${error.message}`);
      return {
        isValid: false,
        deviations: {},
        warnings: [`Price validation error: ${error.message}`],
      };
    }
  }

  async checkEmergencyStop(): Promise<{
    isActive: boolean;
    reason?: string;
    activatedAt?: Date;
  }> {
    this.logger.log('Checking emergency stop status');

    try {
      // In production, check contract state or database flag
      // For now, return normal operation
      return {
        isActive: false,
      };
    } catch (error) {
      this.logger.error(`Emergency stop check failed: ${error.message}`);
      return {
        isActive: true,
        reason: 'Unable to verify system status',
        activatedAt: new Date(),
      };
    }
  }

  private async validateSignature(
    request: AIAuthRequest,
  ): Promise<SecurityValidation> {
    const isTimestampValid =
      Date.now() - request.timestamp < this.SIGNATURE_TIMEOUT;

    // Mock signature validation - in production, use actual cryptographic verification
    const isValidSignature = request.signature
      ? request.signature.length === 132
      : false; // 0x + 130 chars

    return {
      isValidSignature,
      isTimestampValid,
      isOperationAllowed: true,
      isPriceAnchorValid: true,
      riskScore: 2, // Low risk by default
      warnings: [],
    };
  }

  private async getUserPermissions(userId: string): Promise<UserPermissions> {
    // In production, fetch from database
    // For now, return default permissions
    return {
      canOptimizeDeposits: true,
      canExecuteSwaps: true,
      canAccessMarketData: true,
      canModifyPortfolio: true,
      maxDepositAmount: BigInt('10000000000000000000000'), // 10,000 tokens
      maxSlippageTolerance: 0.03, // 3%
      allowedTokens: ['AAVE', 'WETH', 'WBTC', 'LINK'],
      rateLimit: {
        requestsPerHour: 100,
        executionsPerDay: 20,
      },
    };
  }

  private isOperationAllowed(
    operation: string,
    permissions: UserPermissions,
  ): boolean {
    switch (operation) {
      case 'optimize-deposit':
        return permissions.canOptimizeDeposits;
      case 'execute-swap':
        return permissions.canExecuteSwaps;
      case 'market-analysis':
        return permissions.canAccessMarketData;
      case 'modify-portfolio':
        return permissions.canModifyPortfolio;
      default:
        return false;
    }
  }

  private checkRateLimit(
    userId: string,
    operation: string,
    permissions: UserPermissions,
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const userLimits = this.rateLimitStorage.get(userId) || {
      hourlyRequests: 0,
      dailyExecutions: 0,
      lastHourReset: now,
      lastDayReset: now,
    };

    // Reset hourly counter if needed
    if (now - userLimits.lastHourReset > 3600000) {
      // 1 hour
      userLimits.hourlyRequests = 0;
      userLimits.lastHourReset = now;
    }

    // Reset daily counter if needed
    if (now - userLimits.lastDayReset > 86400000) {
      // 24 hours
      userLimits.dailyExecutions = 0;
      userLimits.lastDayReset = now;
    }

    // Check limits
    const hourlyAllowed =
      userLimits.hourlyRequests < permissions.rateLimit.requestsPerHour;
    const dailyAllowed =
      operation !== 'execute-swap' ||
      userLimits.dailyExecutions < permissions.rateLimit.executionsPerDay;

    const allowed = hourlyAllowed && dailyAllowed;
    const remaining = Math.min(
      permissions.rateLimit.requestsPerHour - userLimits.hourlyRequests,
      operation === 'execute-swap'
        ? permissions.rateLimit.executionsPerDay - userLimits.dailyExecutions
        : permissions.rateLimit.requestsPerHour,
    );

    return {
      allowed,
      remaining: Math.max(0, remaining),
      resetTime: Math.max(
        userLimits.lastHourReset + 3600000,
        userLimits.lastDayReset + 86400000,
      ),
    };
  }

  private updateRateLimit(userId: string, operation: string): void {
    const userLimits = this.rateLimitStorage.get(userId) || {
      hourlyRequests: 0,
      dailyExecutions: 0,
      lastHourReset: Date.now(),
      lastDayReset: Date.now(),
    };

    userLimits.hourlyRequests++;
    if (operation === 'execute-swap') {
      userLimits.dailyExecutions++;
    }

    this.rateLimitStorage.set(userId, userLimits);
  }

  private async performSecurityValidation(
    request: AIAuthRequest,
  ): Promise<SecurityValidation> {
    let riskScore = 0;
    const warnings: string[] = [];

    // Check operation type risk
    if (request.operation === 'execute-swap') {
      riskScore += 2;
    }

    // Check parameter values
    if (
      request.parameters.amount &&
      BigInt(request.parameters.amount) > BigInt('1000000000000000000000')
    ) {
      riskScore += 2;
      warnings.push('Large transaction amount detected');
    }

    if (request.parameters.slippage && request.parameters.slippage > 0.05) {
      riskScore += 3;
      warnings.push('High slippage tolerance requested');
    }

    // Check timestamp freshness
    const age = Date.now() - request.timestamp;
    if (age > 60000) {
      // 1 minute
      riskScore += 1;
      warnings.push('Stale request timestamp');
    }

    return {
      isValidSignature: true,
      isTimestampValid: age < this.SIGNATURE_TIMEOUT,
      isOperationAllowed: true,
      isPriceAnchorValid: true,
      riskScore: Math.min(riskScore, 10),
      warnings,
    };
  }

  private getPermissionsList(permissions: UserPermissions): string[] {
    const permissionList: string[] = [];

    if (permissions.canOptimizeDeposits)
      permissionList.push('optimize-deposits');
    if (permissions.canExecuteSwaps) permissionList.push('execute-swaps');
    if (permissions.canAccessMarketData)
      permissionList.push('access-market-data');
    if (permissions.canModifyPortfolio) permissionList.push('modify-portfolio');

    return permissionList;
  }

  private createSignatureMessage(operation: string, parameters: any): string {
    // Create a deterministic message for signing
    const sortedParams = Object.keys(parameters)
      .sort()
      .reduce((result, key) => {
        result[key] = parameters[key];
        return result;
      }, {} as any);

    return `${operation}:${JSON.stringify(sortedParams)}:${Date.now()}`;
  }

  private generateMockSignature(message: string): string {
    // Generate a mock signature for testing
    // In production, use actual cryptographic signing
    const hash = crypto.createHash('sha256').update(message).digest('hex');
    return `0x${hash}${hash.substring(0, 6)}`; // 132 character signature
  }

  // Emergency circuit breaker methods
  async activateEmergencyStop(
    reason: string,
    activatedBy: string,
  ): Promise<void> {
    this.logger.warn(`Emergency stop activated by ${activatedBy}: ${reason}`);

    // In production, update contract state or database
    // For now, just log the event
  }

  async deactivateEmergencyStop(deactivatedBy: string): Promise<void> {
    this.logger.log(`Emergency stop deactivated by ${deactivatedBy}`);

    // In production, update contract state or database
    // For now, just log the event
  }

  // Audit logging
  async logAuthorization(
    request: AIAuthRequest,
    result: AuthorizationResult,
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date(),
      userId: request.userId,
      operation: request.operation,
      authorized: result.authorized,
      reason: result.reason,
      riskFactors: this.extractRiskFactors(request),
    };

    this.logger.log(`Authorization logged: ${JSON.stringify(logEntry)}`);

    // In production, store in secure audit database
  }

  private extractRiskFactors(request: AIAuthRequest): string[] {
    const riskFactors: string[] = [];

    if (
      request.parameters.amount &&
      BigInt(request.parameters.amount) > BigInt('1000000000000000000000')
    ) {
      riskFactors.push('large-amount');
    }

    if (request.parameters.slippage && request.parameters.slippage > 0.03) {
      riskFactors.push('high-slippage');
    }

    return riskFactors;
  }
}
