# Chainlink Price Feed Implementation

This document describes the complete implementation of Chainlink Data Feeds integration in the Alioth backend, following the official [Chainlink documentation](https://docs.chain.link/data-feeds/price-feeds).

## Overview

The Chainlink integration provides real-time, accurate price data for DeFi tokens across multiple blockchain networks. It replaces mock price data with live oracle feeds and includes comprehensive validation, staleness detection, and multi-chain support.

## Architecture

### Core Components

1. **ChainlinkPriceFeedService** - Core service for interacting with Chainlink price feeds
2. **ChainlinkDataService** - Enhanced service that integrates Chainlink data with market analysis
3. **MarketAnalysisController** - REST API endpoints for accessing Chainlink functionality

### Supported Networks

- **Ethereum Mainnet** (Chain ID: 1)
- **Ethereum Sepolia Testnet** (Chain ID: 11155111)
- **Arbitrum One** (Chain ID: 42161)
- **Polygon** (Chain ID: 137)
- **Base** (Chain ID: 8453)

### Supported Price Feeds

#### Ethereum Mainnet & Sepolia

- ETH/USD
- BTC/USD
- AAVE/USD
- LINK/USD
- USDC/USD (Mainnet only)
- USDT/USD (Mainnet only)

#### Arbitrum, Polygon, Base

- ETH/USD
- BTC/USD
- LINK/USD

## Features

### 1. Real-time Price Data

- Fetch current USD prices for supported tokens
- Price staleness validation with configurable thresholds
- Automatic fallback to mock prices when feeds are unavailable

### 2. Historical Data Access

- Retrieve price data for specific rounds
- Access to complete round information (startedAt, answeredInRound, etc.)

### 3. Multi-token Price Fetching

- Parallel price retrieval for multiple tokens
- Optimized batch processing for efficiency

### 4. Price Validation

- Compare expected prices against Chainlink oracles
- Configurable deviation thresholds
- Comprehensive validation reporting with warnings and errors

### 5. Feed Configuration Discovery

- Query available price feeds per network
- Get detailed feed information (address, decimals, heartbeat, etc.)
- Live feed description retrieval

## API Endpoints

### Basic Price Queries

#### Get Single Token Price

```http
GET /market-analysis/chainlink/price/:symbol?chainId=11155111
```

**Example Response:**

```json
{
  "price": 2300.45,
  "timestamp": 1703123456,
  "roundId": 12345,
  "decimals": 8,
  "symbol": "ETH",
  "isStale": false,
  "staleness": 120
}
```

#### Get Multiple Token Prices

```http
POST /market-analysis/chainlink/prices/multiple
```

**Request Body:**

```json
{
  "symbols": ["ETH", "BTC", "LINK"],
  "chainId": 11155111
}
```

**Example Response:**

```json
{
  "ETH": {
    "price": 2300.45,
    "timestamp": 1703123456,
    "roundId": 12345,
    "decimals": 8,
    "symbol": "ETH",
    "isStale": false,
    "staleness": 120
  },
  "BTC": {
    "price": 42000.0,
    "timestamp": 1703123450,
    "roundId": 67890,
    "decimals": 8,
    "symbol": "BTC",
    "isStale": false,
    "staleness": 126
  }
}
```

### Price Validation

#### Validate Price Against Chainlink

```http
POST /market-analysis/chainlink/validate-price
```

**Request Body:**

```json
{
  "symbol": "ETH",
  "expectedPrice": 2350.0,
  "chainId": 11155111,
  "deviationThreshold": 0.05
}
```

**Example Response:**

```json
{
  "isValid": true,
  "deviation": 0.021,
  "chainlinkPrice": 2300.45,
  "warnings": []
}
```

### Historical Data

#### Get Historical Price Data

```http
GET /market-analysis/chainlink/historical/:symbol/:roundId?chainId=11155111
```

**Example Response:**

```json
{
  "price": 2295.3,
  "timestamp": 1703120000,
  "roundId": 12340,
  "decimals": 8,
  "symbol": "ETH",
  "isStale": false,
  "staleness": 3456,
  "startedAt": 1703119980,
  "answeredInRound": 12340
}
```

### Configuration & Discovery

#### Get Supported Chains

```http
GET /market-analysis/chainlink/supported-chains
```

**Example Response:**

```json
{
  "chains": [1, 11155111, 42161, 137, 8453],
  "chainDetails": {
    "1": {
      "chainId": 1,
      "name": "Ethereum Mainnet",
      "availableSymbols": ["ETH", "BTC", "AAVE", "LINK", "USDC", "USDT"]
    },
    "11155111": {
      "chainId": 11155111,
      "name": "Ethereum Sepolia Testnet",
      "availableSymbols": ["ETH", "BTC", "AAVE", "LINK"]
    }
  }
}
```

#### Get Price Feed Information

```http
GET /market-analysis/chainlink/feed-info/:symbol?chainId=11155111
```

**Example Response:**

```json
{
  "address": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  "decimals": 8,
  "description": "ETH / USD",
  "symbol": "ETH",
  "heartbeat": 3600,
  "threshold": 0.5,
  "liveDescription": "ETH / USD"
}
```

## Integration with Market Analysis

The Chainlink implementation is fully integrated with the existing market analysis system:

### Enhanced Market Analysis

```http
GET /market-analysis?tokens=ETH,BTC,LINK
```

Now returns real Chainlink prices instead of mock data:

```json
{
  "timestamp": "2023-12-21T10:30:45.123Z",
  "tokens": [
    {
      "token": "ETH",
      "symbol": "ETH",
      "currentPrice": 2300.45,  // Real Chainlink price
      "priceChange24h": -0.015,
      "volatility": 0.12,
      "liquidityUSD": 50000000,
      "yields": [...],
      "riskScore": 2
    }
  ],
  "marketConditions": {...},
  "correlations": [...],
  "volatilityIndex": 45.2,
  "liquidityMetrics": {...}
}
```

## Configuration

### Environment Variables

Add these environment variables to configure additional RPC endpoints:

```bash
# Blockchain RPC URLs
MAINNET_RPC_URL=https://eth.public-rpc.com
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
POLYGON_RPC_URL=https://polygon-rpc.com
BASE_RPC_URL=https://mainnet.base.org

# Default chain ID for price feeds
CHAIN_ID=11155111

# Optional: Chainlink API key for enhanced features
CHAINLINK_API_KEY=your_api_key_here
```

### Service Configuration

The services are automatically configured through dependency injection:

```typescript
// services/chainlink-data.service.ts
constructor(
  @InjectModel(MarketDataCache.name)
  private marketDataCacheModel: Model<MarketDataCacheDocument>,
  private configService: ConfigService,
  private chainlinkPriceFeedService: ChainlinkPriceFeedService, // Auto-injected
) {}
```

## Error Handling & Resilience

### Graceful Degradation

- Automatic fallback to mock prices when Chainlink feeds are unavailable
- Detailed error logging for debugging
- Validation warnings for stale price data

### Staleness Detection

- Configurable staleness thresholds per feed
- Automatic warnings for stale data
- Heartbeat-based validation

### Example Error Response

```json
{
  "statusCode": 500,
  "message": "Unable to fetch price for UNSUPPORTED: No price feed found for symbol: UNSUPPORTED",
  "timestamp": "2023-12-21T10:30:45.123Z"
}
```

## Usage Examples

### TypeScript Service Usage

```typescript
import { ChainlinkPriceFeedService } from './services/chainlink-price-feed.service';

// Inject service
constructor(private chainlinkService: ChainlinkPriceFeedService) {}

// Get single price
const ethPrice = await this.chainlinkService.getTokenPriceUSD('ETH', 11155111);
console.log(`ETH price: $${ethPrice.price} (${ethPrice.isStale ? 'stale' : 'fresh'})`);

// Get multiple prices
const prices = await this.chainlinkService.getMultipleTokenPrices(
  ['ETH', 'BTC', 'LINK'],
  11155111
);

// Validate price
const validation = await this.chainlinkService.validatePriceData(
  'ETH',
  2350.00,
  11155111
);
```

### Frontend Integration

```javascript
// Fetch current ETH price
const response = await fetch(
  '/api/market-analysis/chainlink/price/ETH?chainId=11155111',
);
const priceData = await response.json();

// Display price with staleness indicator
const displayPrice = `$${priceData.price.toFixed(2)} ${priceData.isStale ? '⚠️' : '✅'}`;

// Fetch multiple prices
const multipleResponse = await fetch(
  '/api/market-analysis/chainlink/prices/multiple',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbols: ['ETH', 'BTC', 'LINK'],
      chainId: 11155111,
    }),
  },
);
const prices = await multipleResponse.json();
```

## Testing

Run the comprehensive test suite:

```bash
# Unit tests
npm test chainlink-price-feed.service.spec.ts

# E2E tests
npm run test:e2e chainlink-price-feed.e2e-spec.ts

# Test with real Sepolia testnet
SEPOLIA_RPC_URL=https://rpc.sepolia.org npm run test:e2e
```

## Monitoring & Observability

### Logging

All Chainlink operations are logged with appropriate levels:

- **INFO**: Successful price fetches, cache hits
- **WARN**: Stale price data, fallback usage
- **ERROR**: Feed failures, network issues

### Example Log Output

```
[ChainlinkPriceFeedService] 🔗 Getting Chainlink price for ETH on chain 11155111
[ChainlinkPriceFeedService] ✅ ETH/USD: $2300.45 (Round: 12345, Updated: 2023-12-21T10:28:45.000Z, Staleness: 120s)
[ChainlinkDataService] ✅ Fresh Chainlink price for ETH: $2300.45 (120s old)
```

## Security Considerations

### Price Manipulation Protection

- Multiple price feed validation
- Deviation threshold enforcement
- Staleness detection prevents using outdated data

### Network Security

- Uses read-only RPC connections
- No private key exposure in price fetching
- Supports multiple RPC endpoints for redundancy

## Performance Optimizations

### Caching

- Market analysis results cached for 60 seconds
- Efficient batch price fetching
- Parallel processing for multiple tokens

### Rate Limiting

- Built-in rate limiting for API endpoints
- Efficient connection pooling for blockchain calls
- Optimized for high-frequency price updates

## Future Enhancements

### Planned Features

1. **Real-time Price Streams** - WebSocket integration for live price updates
2. **Custom Price Feeds** - Support for custom aggregation strategies
3. **Cross-chain Price Arbitrage** - Price difference detection across chains
4. **Advanced Analytics** - Price trend analysis and prediction
5. **Alert System** - Notifications for significant price movements

### Integration Roadmap

1. **Smart Contract Integration** - Direct price feed usage in smart contracts
2. **Frontend Real-time Updates** - WebSocket price streaming to frontend
3. **Mobile App Support** - Push notifications for price alerts
4. **Advanced Charting** - Historical price visualization

## Troubleshooting

### Common Issues

**Issue**: "No price feed found for symbol"

- **Solution**: Check if the token is supported on the specified chain using `/supported-chains`

**Issue**: "Stale price data" warnings

- **Solution**: Normal for testnet feeds; configure longer staleness thresholds if needed

**Issue**: "RPC connection failed"

- **Solution**: Verify RPC URL configuration and network connectivity

**Issue**: "Price deviation too high"

- **Solution**: Adjust deviation thresholds or check for market volatility

### Debug Mode

Enable detailed logging by setting:

```bash
LOG_LEVEL=debug
```

## Conclusion

The Chainlink integration provides production-ready, reliable price data for the Alioth DeFi platform. It follows best practices from the official Chainlink documentation and includes comprehensive error handling, validation, and multi-chain support.

The implementation ensures that all price-dependent operations in the Alioth ecosystem use accurate, real-time oracle data while maintaining backward compatibility and graceful degradation when needed.
