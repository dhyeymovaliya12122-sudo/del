// ─────────────────────────────────────────────────────────────────────────────
//  infrastructure/cache/cache.module.ts
//  When REDIS_MOCK=true (local dev), provides an in-memory ioredis-mock instance.
//  When REDIS_MOCK=false (production), connects to a real Redis server.
// ─────────────────────────────────────────────────────────────────────────────
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Token used with @InjectRedis() throughout the app
export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const isMock = config.get<boolean>('redis.mock', false);
        const isProd = config.get<string>('NODE_ENV') === 'production';

        if (isMock) {
          if (isProd) {
            console.error(
              '🚨 [CRITICAL CONFIG WARNING] REDIS_MOCK=true is active in PRODUCTION! BullMQ queues, Redis streams, circuit breaker, and distributed WebSockets WILL FAIL or drop messages. Set REDIS_MOCK=false and configure REDIS_HOST/REDIS_PORT.',
            );
          }
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const RedisMock = require('ioredis-mock');
          return new RedisMock();
        }

        const { default: Redis } = await import('ioredis');
        return new Redis({
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password') || undefined,
          db: config.get<number>('redis.db', 0),
          keyPrefix: config.get<string>('redis.keyPrefix', 'wa:session:'),
          retryStrategy: (times: number) => Math.min(times * 100, 3000),
          lazyConnect: false,
          enableOfflineQueue: true,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class CacheModule {}
