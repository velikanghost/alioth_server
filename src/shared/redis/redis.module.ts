import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('config.redis.host'),
          port: configService.get<number>('config.redis.port'),
          password:
            configService.get<string>('config.redis.password') || undefined,
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
        const client = createClient({
          socket: {
            host: configService.get<string>('config.redis.host'),
            port: configService.get<number>('config.redis.port'),
          },
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
