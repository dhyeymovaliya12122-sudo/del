// ─────────────────────────────────────────────────────────────────────────────
//  modules/message-queue/message-queue.module.ts
//  Phase 2 — Feature: Queue Rate Limiting (Anti-Spam / Anti-Ban)
//
//  Architecture:
//  - One BullMQ queue per WhatsApp account: wa:outbound:<accountId>
//  - Per-queue rate limiter: max 3-5 messages/sec via BullMQ limiter
//  - Concurrency: max 2 parallel workers per queue
//  - Exponential backoff on failure
//  - Queue is PAUSED instantly when circuit breaker OPENS for that account
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { MessageQueueLogEntity } from './entities/message-queue-log.entity';
import { OutboundMessageQueueService } from './services/outbound-message-queue.service';
import { MessageQueueWorker } from './workers/message-queue.worker';
import { QueueRateLimiterService } from './services/queue-rate-limiter.service';
import { MessageQueueController } from './controllers/message-queue.controller';
import { SessionHydrationModule } from '../session-hydration/session-hydration.module';
import { WhatsappAccountEntity } from '../session-hydration/entities/whatsapp-account.entity';
import { ProxyCircuitBreakerModule } from '../proxy-circuit-breaker/proxy-circuit-breaker.module';

import { MessageQueueService } from './services/message-queue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageQueueLogEntity, WhatsappAccountEntity]),
    // The default outbound queue (per-account queues created dynamically)
    BullModule.registerQueueAsync({
      name: 'outbound-messages',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        prefix: config.get<string>('BULLMQ_QUEUE_PREFIX', 'wa'),
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 100,
          attempts: config.get<number>('BULLMQ_MAX_RETRIES', 5),
          backoff: {
            type: 'exponential',
            delay: config.get<number>('BULLMQ_BACKOFF_DELAY_MS', 5000),
          },
        },
      }),
    }),
    SessionHydrationModule,
    ProxyCircuitBreakerModule,
  ],
  controllers: [MessageQueueController],
  providers: [
    OutboundMessageQueueService,  // Enqueues message jobs with rate-limit headers
    MessageQueueService,          // Alias for enterprise queue service
    MessageQueueWorker,            // BullMQ processor: sends via Baileys + respects rate limits
    QueueRateLimiterService,       // Manages per-account rate limit tokens in Redis
  ],
  exports: [OutboundMessageQueueService, MessageQueueService],
})
export class MessageQueueModule {}
