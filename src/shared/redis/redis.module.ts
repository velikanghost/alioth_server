import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('config.redis.host') || 'localhost',
          port: configService.get<number>('config.redis.port') || 6379,
          password:
            configService.get<string>('config.redis.password') || undefined,
          tls:
            configService.get<string>('config.redis.tls') === 'true'
              ? {}
              : undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const host =
          configService.get<string>('config.redis.host') || 'localhost';
        const port = configService.get<number>('config.redis.port') || 6379;
        const tlsEnabled =
          configService.get<string>('config.redis.tls') === 'true';

        const client = createClient({
          socket: tlsEnabled
            ? { host, port, tls: true as const }
            : { host, port },
          password:
            configService.get<string>('config.redis.password') || undefined,
        });
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [BullModule, 'REDIS_CLIENT'],
})
export class RedisModule {}
