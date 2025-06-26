import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    uri: process.env.MONGODB_URI || '',
    testUri: process.env.MONGODB_TEST_URI || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    tls: process.env.REDIS_TLS || 'false',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  privy: {
    appId: process.env.PRIVY_APP_ID,
    appSecret: process.env.PRIVY_APP_SECRET,
  },
  blockchain: {
    chainId: parseInt(process.env.CHAIN_ID || '11155111', 10),

    sepolia: {
      rpcUrl: process.env.SEPOLIA_RPC_URL,
      chainId: 11155111,
    },
    baseSepolia: {
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
    },
    avalancheFuji: {
      rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL,
      chainId: 43113,
    },
  },
  aiAgent: {
    endpoint: process.env.AI_AGENT_ENDPOINT || 'http://localhost:3001',
    apiKey: process.env.AI_AGENT_API_KEY || '',
    timeout: parseInt(process.env.AI_AGENT_TIMEOUT || '30000', 10),
  },
  contracts: {
    enhancedYieldOptimizer: process.env.ALIOTH_YIELD_OPTIMIZER_ADDRESS,
    chainlinkFeedManager: process.env.CHAINLINK_FEED_MANAGER_ADDRESS,
    chainlinkAutomationRegistry: process.env.CHAINLINK_AUTOMATION_REGISTRY,
    aliothVault: process.env.ALIOTH_VAULT_ADDRESS,
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_LIMIT || '10', 10),
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
  },
}));
