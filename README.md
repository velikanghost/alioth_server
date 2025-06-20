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
- 🔗 **External AI Integration** - Communicates with external AI services for yield optimization
- 📊 **Real-time Data** - Chainlink oracles for APR tracking and price feeds
- 🔄 **Cross-Chain Operations** - CCIP integration for seamless multi-chain transactions
- 📈 **Yield Optimization** - Automated rebalancing through external AI strategies
- 💰 **Dynamic Lending** - AI-powered loan underwriting with off-chain credit data

## Architecture

### Core Modules

- **Auth Module** - Web3 wallet authentication with JWT
- **Yield Vault Module** - Automated yield optimization execution
- **Cross-Chain Lending Module** - Multi-chain lending and borrowing
- **External AI Module** - Communication with external AI services
- **Market Analysis Module** - Real-time market data and analytics
- **Swap Execution Module** - DEX aggregation and swap execution
- **Performance Tracking Module** - Portfolio performance analytics
- **Notifications Module** - User notifications and alerts

### External AI Integration

The backend provides a comprehensive API for external AI services to:

1. **Access Market Data** - Real-time token prices, yields, volatility, and correlations
2. **Get Portfolio Data** - Current user positions and performance metrics
3. **Execute Strategies** - Implementation of AI-generated optimization strategies
4. **Validate Strategies** - Pre-execution validation of AI recommendations
5. **Track Performance** - Analytics on AI decision accuracy and effectiveness

#### External AI Endpoints

- `POST /external-ai/market-data` - Provide market data for AI analysis
- `POST /external-ai/portfolio-data` - Provide user portfolio data
- `POST /external-ai/execute-optimization` - Execute AI optimization strategy
- `GET /external-ai/supported-tokens` - Get supported tokens list
- `GET /external-ai/supported-protocols` - Get supported DeFi protocols
- `POST /external-ai/validate-strategy` - Validate optimization strategy
- `GET /external-ai/gas-estimates` - Get current gas estimates
- `POST /external-ai/log-ai-decision` - Log AI decisions for analytics
- `GET /external-ai/performance-metrics` - Get AI performance metrics

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
```

## API Documentation

### Core DeFi Operations

- **Market Analysis**: Real-time token prices, yields, and market data
- **Vault Management**: Deposit, withdraw, and manage yield vault positions
- **Swap Execution**: DEX aggregation for optimal token swaps
- **Performance Tracking**: Portfolio analytics and performance metrics

### External AI Integration

The backend serves as a data provider and execution engine for external AI services:

1. **Data Provider**: Supplies real-time market and portfolio data
2. **Strategy Validator**: Validates AI-generated strategies before execution
3. **Execution Engine**: Implements validated strategies through smart contracts
4. **Analytics Hub**: Tracks and analyzes AI decision performance

### WebSocket Events

Real-time updates for:

- Portfolio value changes
- Market data updates
- Strategy execution status
- Performance metrics

## Development Guidelines

### Project Structure

- Use modular architecture with feature-based modules in `/src/modules/`
- Separate shared services in `/src/shared/`
- Place common utilities in `/src/common/`
- Follow the established folder structure with controllers, services, DTOs, and schemas

### Code Patterns

- Use dependency injection throughout the application
- Implement proper error handling with custom filters
- Apply validation pipes for all DTOs using class-validator
- Use guards for authentication and authorization
- Implement interceptors for request/response transformation

### Database (MongoDB)

- Use Mongoose schemas with proper decorators (@Prop, @Schema)
- Include timestamps and proper indexing
- Implement proper query optimization
- Use transactions for complex operations

### API Development

- Follow RESTful conventions for all endpoints
- Use Swagger/OpenAPI documentation (@ApiOperation, @ApiResponse)
- Implement proper pagination with PaginationDto
- Return consistent response formats
- Use proper HTTP status codes

## Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Contributing

1. Follow the coding standards outlined in this README
2. Write comprehensive tests for new features
3. Update documentation for API changes
4. Ensure all external AI integration points are properly tested

## License

This project is licensed under the MIT License.
