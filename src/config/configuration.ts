import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/alioth',
    testUri:
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/alioth_test',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  blockchain: {
    chainId: parseInt(process.env.CHAIN_ID || '11155111', 10), // Default to Sepolia
    privateKey: process.env.PRIVATE_KEY,
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
  chainlink: {
    //nodeUrl: process.env.CHAINLINK_NODE_URL,
    apiKey: process.env.CHAINLINK_API_KEY,
  },
  llm: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    //anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  },
  notifications: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    discord: {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    },
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
    },
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_LIMIT || '10', 10),
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
  },
}));
