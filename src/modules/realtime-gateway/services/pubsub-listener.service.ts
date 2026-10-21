// ─────────────────────────────────────────────────────────────────────────────
//  modules/realtime-gateway/services/pubsub-listener.service.ts
//  Phase 2: Subscribes to Redis Pub/Sub channels for cross-node events.
//
//  Channels listened:
//    wa:queue:control       → queue pause/resume commands from circuit breaker
//    wa:session:events      → session hydration events (connect/disconnect)
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';

@Injectable()
export class PubSubListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PubSubListenerService.name);
  private subscriber: Redis;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Duplicate the connection for subscribe-only mode
    this.subscriber = this.redis.duplicate();

    await this.subscriber.subscribe(
      'wa:queue:control',
      'wa:session:events',
    );

    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message);
    });

    this.logger.log('📡 Redis Pub/Sub listener active on: wa:queue:control, wa:session:events');
  }

  onModuleDestroy(): void {
    this.subscriber?.disconnect();
  }

  private handleMessage(channel: string, message: string): void {
    try {
      const payload = JSON.parse(message);

      if (channel === 'wa:queue:control') {
        const { action, accountId, queueName, reason } = payload;
        this.logger.log(
          `[PubSub] Queue control: ${action} → ${queueName} (reason: ${reason ?? 'manual'})`,
        );
        // Other nodes listen here to react to queue pause/resume from circuit breaker
      }

      if (channel === 'wa:session:events') {
        this.logger.debug(`[PubSub] Session event: ${JSON.stringify(payload)}`);
      }
    } catch (err) {
      this.logger.error(`[PubSub] Failed to parse message on ${channel}: ${err.message}`);
    }
  }

  /** Publish an event to a Redis Pub/Sub channel */
  async publish(channel: string, payload: object): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(payload));
  }
}
