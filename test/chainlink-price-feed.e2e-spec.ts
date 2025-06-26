import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { MarketAnalysisModule } from '../src/modules/market-analysis/market-analysis.module';
import { ChainlinkPriceFeedService } from '../src/modules/market-analysis/services/chainlink-price-feed.service';

describe('ChainlinkPriceFeedController (e2e)', () => {
  let app: INestApplication;
  let chainlinkService: ChainlinkPriceFeedService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [configuration],
          isGlobal: true,
        }),
        MarketAnalysisModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    chainlinkService = moduleFixture.get<ChainlinkPriceFeedService>(
      ChainlinkPriceFeedService,
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/market-analysis/chainlink', () => {
    it('/price/ETH (GET) - should return ETH price from Chainlink', async () => {
      const response = await request(app.getHttpServer())
        .get('/market-analysis/chainlink/price/ETH')
        .query({ chainId: 11155111 }) // Sepolia testnet
        .expect(200);

      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('roundId');
      expect(response.body).toHaveProperty('symbol', 'ETH');
      expect(response.body).toHaveProperty('isStale');
      expect(response.body).toHaveProperty('staleness');
      expect(typeof response.body.price).toBe('number');
      expect(response.body.price).toBeGreaterThan(0);
    });

    it('/prices/multiple (POST) - should return multiple token prices', async () => {
      const response = await request(app.getHttpServer())
        .post('/market-analysis/chainlink/prices/multiple')
        .send({
          symbols: ['ETH', 'BTC', 'LINK'],
          chainId: 11155111,
        })
        .expect(200);

      expect(response.body).toHaveProperty('ETH');
      expect(response.body).toHaveProperty('BTC');
      expect(response.body).toHaveProperty('LINK');

      for (const symbol of ['ETH', 'BTC', 'LINK']) {
        expect(response.body[symbol]).toHaveProperty('price');
        expect(response.body[symbol]).toHaveProperty('timestamp');
        expect(response.body[symbol]).toHaveProperty('symbol', symbol);
        expect(typeof response.body[symbol].price).toBe('number');
        expect(response.body[symbol].price).toBeGreaterThan(0);
      }
    });

    it('/validate-price (POST) - should validate price against Chainlink', async () => {
      // First get current ETH price
      const priceResponse = await request(app.getHttpServer())
        .get('/market-analysis/chainlink/price/ETH')
        .query({ chainId: 11155111 });

      const currentPrice = priceResponse.body.price;
      const expectedPrice = currentPrice * 1.02; // 2% higher than current

      const response = await request(app.getHttpServer())
        .post('/market-analysis/chainlink/validate-price')
        .send({
          symbol: 'ETH',
          expectedPrice,
          chainId: 11155111,
          deviationThreshold: 0.05, // 5%
        })
        .expect(200);

      expect(response.body).toHaveProperty('isValid');
      expect(response.body).toHaveProperty('deviation');
      expect(response.body).toHaveProperty('chainlinkPrice');
      expect(response.body).toHaveProperty('warnings');
      expect(typeof response.body.isValid).toBe('boolean');
      expect(typeof response.body.deviation).toBe('number');
      expect(Array.isArray(response.body.warnings)).toBe(true);
    });

    it('/supported-chains (GET) - should return supported blockchain networks', async () => {
      const response = await request(app.getHttpServer())
        .get('/market-analysis/chainlink/supported-chains')
        .expect(200);

      expect(response.body).toHaveProperty('chains');
      expect(response.body).toHaveProperty('chainDetails');
      expect(Array.isArray(response.body.chains)).toBe(true);
      expect(response.body.chains.length).toBeGreaterThan(0);

      // Should include Sepolia testnet
      expect(response.body.chains).toContain(11155111);

      // Should include mainnet
      expect(response.body.chains).toContain(1);

      // Check chain details structure
      expect(response.body.chainDetails['11155111']).toHaveProperty(
        'chainId',
        11155111,
      );
      expect(response.body.chainDetails['11155111']).toHaveProperty('name');
      expect(response.body.chainDetails['11155111']).toHaveProperty(
        'availableSymbols',
      );
      expect(
        Array.isArray(response.body.chainDetails['11155111'].availableSymbols),
      ).toBe(true);
    });

    it('/feed-info/ETH (GET) - should return price feed configuration', async () => {
      const response = await request(app.getHttpServer())
        .get('/market-analysis/chainlink/feed-info/ETH')
        .query({ chainId: 11155111 })
        .expect(200);

      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('decimals');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('symbol', 'ETH');
      expect(response.body).toHaveProperty('heartbeat');
      expect(response.body).toHaveProperty('threshold');
      expect(response.body).toHaveProperty('liveDescription');

      expect(typeof response.body.address).toBe('string');
      expect(typeof response.body.decimals).toBe('number');
      expect(response.body.address).toMatch(/^0x[a-fA-F0-9]{40}$/); // Valid Ethereum address
    });

    it('should handle unsupported token gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/market-analysis/chainlink/price/UNSUPPORTED')
        .query({ chainId: 11155111 })
        .expect(500); // Should return error for unsupported token

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('UNSUPPORTED');
    });

    it('should handle unsupported chain gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/market-analysis/chainlink/price/ETH')
        .query({ chainId: 999999 }) // Unsupported chain
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('ChainlinkPriceFeedService Unit Tests', () => {
    it('should check price feed availability correctly', () => {
      expect(chainlinkService.isPriceFeedAvailable('ETH', 11155111)).toBe(true);
      expect(chainlinkService.isPriceFeedAvailable('BTC', 11155111)).toBe(true);
      expect(
        chainlinkService.isPriceFeedAvailable('UNSUPPORTED', 11155111),
      ).toBe(false);
      expect(chainlinkService.isPriceFeedAvailable('ETH', 999999)).toBe(false);
    });

    it('should return available symbols for supported chains', () => {
      const sepoliaSymbols = chainlinkService.getAvailableSymbols(11155111);
      expect(Array.isArray(sepoliaSymbols)).toBe(true);
      expect(sepoliaSymbols.length).toBeGreaterThan(0);
      expect(sepoliaSymbols).toContain('ETH');
      expect(sepoliaSymbols).toContain('BTC');

      const mainnetSymbols = chainlinkService.getAvailableSymbols(1);
      expect(Array.isArray(mainnetSymbols)).toBe(true);
      expect(mainnetSymbols.length).toBeGreaterThan(0);
    });

    it('should return supported chains', () => {
      const chains = chainlinkService.getSupportedChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain(1); // Mainnet
      expect(chains).toContain(11155111); // Sepolia
    });

    it('should return price feed info for supported tokens', () => {
      const ethFeedInfo = chainlinkService.getPriceFeedInfo('ETH', 11155111);
      expect(ethFeedInfo).toBeTruthy();
      expect(ethFeedInfo?.symbol).toBe('ETH');
      expect(ethFeedInfo?.decimals).toBe(8);
      expect(ethFeedInfo?.address).toBeTruthy();
      expect(ethFeedInfo?.heartbeat).toBeGreaterThan(0);

      const unsupportedFeedInfo = chainlinkService.getPriceFeedInfo(
        'UNSUPPORTED',
        11155111,
      );
      expect(unsupportedFeedInfo).toBeNull();
    });
  });

  describe('Integration with Market Analysis', () => {
    it('/market-analysis (GET) - should use real Chainlink prices', async () => {
      const response = await request(app.getHttpServer())
        .get('/market-analysis')
        .query({ tokens: 'ETH,BTC,LINK' })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(Array.isArray(response.body.tokens)).toBe(true);
      expect(response.body.tokens.length).toBeGreaterThan(0);

      // Check that prices are realistic (not mock values)
      const ethToken = response.body.tokens.find(
        (token: any) => token.symbol === 'ETH',
      );
      expect(ethToken).toBeTruthy();
      expect(ethToken.currentPrice).toBeGreaterThan(1000); // ETH should be > $1000
      expect(ethToken.currentPrice).toBeLessThan(10000); // But < $10000 (reasonable range)
    });
  });
});
