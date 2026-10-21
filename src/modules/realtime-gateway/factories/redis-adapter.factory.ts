// ─────────────────────────────────────────────────────────────────────────────
//  modules/realtime-gateway/factories/redis-adapter.factory.ts
//  Phase 2: Creates the @socket.io/redis-adapter with two dedicated Redis
//  connections (pub + sub) separate from the main application Redis.
//
//  WHY two connections?
//  Redis CLIENT in subscribe mode cannot issue other commands.
//  The adapter needs one connection for SUBSCRIBE (incoming events from
//  other nodes) and one for PUBLISH (outgoing events to other nodes).
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

@Injectable()
export class RedisAdapterFactory implements OnModuleDestroy {
  private readonly logger = new Logger(RedisAdapterFactory.name);
  private pubClient: Redis;
  private subClient: Redis;

  constructor(private readonly config: ConfigService) {}

  async createAdapter() {
    const isRedisMock = this.config.get<string>('REDIS_MOCK') === 'true';
    const useRedisAdapter = this.config.get<string>('SOCKET_IO_REDIS_ADAPTER') === 'true';

    if (isRedisMock || !useRedisAdapter) {
      this.logger.log('ℹ️  Socket.io Redis adapter disabled (mock mode / local dev) — using in-memory Socket.io adapter');
      return null;
    }

    const host = this.config.get<string>('redis.host', 'localhost');
    const port = this.config.get<number>('redis.port', 6379);
    const password = this.config.get<string>('redis.password') || undefined;
    const prefix = this.config.get<string>('SOCKET_IO_PUBSUB_PREFIX', 'wa:pubsub');

    this.logger.log(`Connecting Socket.io Redis adapter (pub+sub) → ${host}:${port}`);

    const options: any = {
      host,
      port,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      connectTimeout: 3000,
      retryStrategy: () => null, // Don't retry — fail fast on missing Redis
    };
    if (password) options.password = password;

    this.pubClient = new Redis(options);
    this.subClient = this.pubClient.duplicate();

    // Suppress unhandled ECONNREFUSED events — missing Redis is non-fatal in dev
    this.pubClient.on('error', (err) => {
      if (!err.message?.includes('ECONNREFUSED')) {
        this.logger.warn(`Redis pub error: ${err.message}`);
      }
    });
    this.subClient.on('error', (err) => {
      if (!err.message?.includes('ECONNREFUSED')) {
        this.logger.warn(`Redis sub error: ${err.message}`);
      }
    });

    try {
      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.logger.log('✅ Socket.io Redis pub+sub connections established');
      return createAdapter(this.pubClient, this.subClient, { key: prefix });
    } catch (err) {
      this.logger.warn(
        `⚠️  Socket.io Redis adapter unavailable (${err.message}). Falling back to in-memory adapter.`,
      );
      this.pubClient?.disconnect();
      this.subClient?.disconnect();
      return null;
    }
  }

  disconnect(): void {
    this.pubClient?.disconnect();
    this.subClient?.disconnect();
  }

  onModuleDestroy(): void {
    this.disconnect();
  }
}
