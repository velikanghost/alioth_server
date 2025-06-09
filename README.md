<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Alioth Backend

AI-driven cross-chain DeFi platform backend built with NestJS.

## Overview

Alioth is a unified, AI-driven Onchain Finance platform that blends two complementary modules:

1. **On-Chain Yield Optimizer Vault** - Continuously chases the highest DeFi APRs across multiple protocols and chains
2. **Cross-Chain Lending & Borrowing Protocol** - Underwrites undercollateralized loans with dynamic interest rates and multi-chain collateral

## Features

- 🔐 **Web3 Authentication** - Wallet-based authentication with signature verification
- 🌐 **Multi-Chain Support** - Ethereum, Avalanche, Fantom, Polygon
- 🤖 **AI Agents** - ElizaOS-style agents for yield optimization and loan underwriting
- 📊 **Real-time Data** - Chainlink oracles for APR tracking and price feeds
- 🔄 **Cross-Chain Operations** - CCIP integration for seamless multi-chain transactions
- 📈 **Yield Optimization** - Automated rebalancing across DeFi protocols
- 💰 **Dynamic Lending** - AI-powered loan underwriting with off-chain credit data

## Architecture

### Core Modules

- **Auth Module** - Web3 wallet authentication with JWT
- **Yield Vault Module** - Automated yield optimization
- **Cross-Chain Lending Module** - Multi-chain lending and borrowing
- **Agents Module** - AI agent orchestration
- **Notifications Module** - User notifications and alerts

### AI Agents

1. **Yield Monitoring & Rebalance Agent** - Tracks APRs and optimizes allocations
2. **Underwriting & Loan Origination Agent** - Processes loan applications
3. **Collateral Rebalance & Yield Integration Agent** - Manages idle collateral
4. **Profit Reporting & Notifications Agent** - Sends user reports and alerts

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- MongoDB
- Redis
- RPC URLs for supported chains

### Installation

1. **Clone and install dependencies:**

```bash
pnpm install
```

2. **Set up environment variables:**

```bash
# Copy environment template
cp .env.template .env

# Edit .env with your configuration
# Fill in MongoDB URI, Redis config, RPC URLs, etc.
```

3. **Start services:**

```bash
# Development mode with hot reload
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

4. **Access the application:**

- API: http://localhost:3000/api/v1
- Swagger Documentation: http://localhost:3000/api/docs

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/alioth
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Blockchain RPC URLs
ETHEREUM_RPC_URL=https://your-ethereum-rpc
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
FANTOM_RPC_URL=https://rpc.fantom.network
POLYGON_RPC_URL=https://your-polygon-rpc

# LLM APIs (for AI agents)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Notifications
DISCORD_WEBHOOK_URL=your-discord-webhook
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Swagger Documentation
SWAGGER_ENABLED=true
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/wallet-login` - Web3 wallet authentication
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `GET /api/v1/auth/profile` - Get user profile

### Yield Vault

- `POST /api/v1/yield-vault/deposit` - Deposit assets to vault
- `POST /api/v1/yield-vault/withdraw` - Withdraw from vault
- `GET /api/v1/yield-vault/balance` - Get vault balance
- `GET /api/v1/yield-vault/apr-history` - Get APR history

### Cross-Chain Lending

- `POST /api/v1/lending/apply` - Apply for loan
- `GET /api/v1/lending/loans` - Get user loans
- `POST /api/v1/lending/repay` - Repay loan
- `GET /api/v1/lending/health-factor` - Get loan health

### Agents

- `GET /api/v1/agents/status` - Get agent status
- `GET /api/v1/agents/logs` - Get agent execution logs
- `POST /api/v1/agents/rebalance` - Trigger manual rebalance

## Development

### Project Structure

```
src/
├── modules/           # Feature modules
│   ├── auth/         # Authentication
│   ├── yield-vault/  # Yield optimization
│   ├── cross-chain-lending/ # Lending protocol
│   ├── agents/       # AI agents
│   └── notifications/ # Notifications
├── shared/           # Shared services
│   ├── database/     # MongoDB configuration
│   ├── redis/        # Redis configuration
│   └── web3/         # Blockchain services
├── common/           # Common utilities
│   ├── dto/          # Data transfer objects
│   ├── guards/       # Authentication guards
│   ├── interceptors/ # Request/response interceptors
│   └── filters/      # Exception filters
└── config/           # Configuration
```

### Available Scripts

```bash
# Development
pnpm run start:dev      # Start with hot reload
pnpm run start:debug    # Start with debugger

# Building
pnpm run build          # Build for production
pnpm run start:prod     # Start production build

# Testing
pnpm run test           # Run unit tests
pnpm run test:watch     # Run tests in watch mode
pnpm run test:e2e       # Run end-to-end tests
pnpm run test:cov       # Run tests with coverage

# Code Quality
pnpm run lint           # Lint and fix code
pnpm run format         # Format code with Prettier
```

## Deployment

### Docker

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Environment Variables for Production

Ensure these are set in production:

- `NODE_ENV=production`
- Strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Production database URLs
- Valid RPC URLs for all chains
- LLM API keys for agent functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

Private - All rights reserved
