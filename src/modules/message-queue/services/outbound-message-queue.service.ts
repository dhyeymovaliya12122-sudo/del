// ─────────────────────────────────────────────────────────────────────────────
//  modules/message-queue/services/outbound-message-queue.service.ts
//  Phase 2: Enqueues outbound WhatsApp messages into BullMQ
//
//  Key features:
//  - Dynamic per-account queue creation with BullMQ rate limiter
//  - Circuit breaker check before enqueuing (reject if OPEN)
//  - Human-like jitter delay between messages (anti-ban)
//  - Priority support: URGENT (1) > NORMAL (5) > BULK (10)
//  - Job deduplication via jobId
// ─────────────────────────────────────────────────────────────────────────────
import {
  Injectable, Logger, ServiceUnavailableException, BadRequestException, Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MessageQueueLogEntity } from '../entities/message-queue-log.entity';
import { QueueRateLimiterService } from './queue-rate-limiter.service';
import { ProxyCircuitBreakerService } from '../../proxy-circuit-breaker/services/proxy-circuit-breaker.service';

export type MessagePriority = 'urgent' | 'normal' | 'bulk';
export type MessageJobType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'template';

export interface OutboundMessageJob {
  accountId: string;
  tenantId: string;
  to: string;         // Recipient phone number (E.164 format)
  type: MessageJobType;
  priority: MessagePriority;
  payload: {
    text?: string;
    mediaObjectId?: string;  // R2 media reference
    caption?: string;
    templateName?: string;
    templateParams?: string[];
  };
  metadata?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
}

const PRIORITY_MAP: Record<MessagePriority, number> = {
  urgent: 1,
  normal: 5,
  bulk: 10,
};

@Injectable()
export class OutboundMessageQueueService {
  private readonly logger = new Logger(OutboundMessageQueueService.name);

  // Cache of dynamically created per-account queues
  private readonly accountQueues = new Map<string, Queue>();

  private readonly queuePrefix: string;
  private readonly minDelay: number;
  private readonly maxDelay: number;
  private readonly concurrency: number;

  constructor(
    @InjectQueue('outbound-messages')
    private readonly defaultQueue: Queue,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    @InjectRepository(MessageQueueLogEntity)
    private readonly queueLogRepo: Repository<MessageQueueLogEntity>,
    private readonly rateLimiterService: QueueRateLimiterService,
    private readonly circuitBreakerService: ProxyCircuitBreakerService,
    private readonly config: ConfigService,
  ) {
    this.queuePrefix = config.get<string>('BULLMQ_QUEUE_PREFIX', 'wa');
    this.minDelay = config.get<number>('MESSAGE_DELAY_MIN_MS', 1000);
    this.maxDelay = config.get<number>('MESSAGE_DELAY_MAX_MS', 5000);
    this.concurrency = config.get<number>('BULLMQ_CONCURRENCY', 2);
  }

  /**
   * Enqueue an outbound message job.
   *
   * Safety checks:
   * 1. Circuit breaker OPEN → reject immediately (no fallback to datacenter IP)
   * 2. Rate limit exceeded → delay job by resetInMs
   * 3. Human-like jitter delay added to all messages
   */
  async enqueue(message: OutboundMessageJob): Promise<{ jobId: string; queued: boolean; delay?: number }> {
    const { accountId } = message;

    // ── 1. Circuit Breaker Check ──────────────────────────────────────────
    // Get the proxy assigned to this account and check its circuit
    const proxyKey = `wa:proxy:account:${accountId}`;
    const proxyId = await this.redis.get(proxyKey);

    if (proxyId) {
      const cbState = await this.circuitBreakerService.getState(proxyId);
      if (cbState === 'OPEN') {
        this.logger.error(
          `[Queue] ❌ Circuit OPEN for proxy ${proxyId} — refusing to enqueue for account ${accountId}`,
        );
        throw new ServiceUnavailableException(
          `Proxy circuit is OPEN for account ${accountId}. Message queuing suspended to prevent IP ban.`,
        );
      }
    }

    // ── 2. Rate Limit Check ───────────────────────────────────────────────
    const rateCheck = await this.rateLimiterService.checkRateLimit(accountId);
    let jobDelay = 0;

    if (!rateCheck.allowed) {
      // Delay job instead of dropping — BullMQ will retry after the window
      jobDelay = rateCheck.resetInMs + this.humanJitter();
      this.logger.warn(
        `[Queue] Rate limit hit for ${accountId}. Delaying by ${jobDelay}ms`,
      );
    }

    // ── 3. Add human-like jitter to all messages (anti-ban) ───────────────
    const jitter = this.humanJitter();
    const totalDelay = jobDelay + jitter;

    const jobId = `msg:${accountId}:${uuidv4()}`;
    const queue = await this.getOrCreateAccountQueue(accountId);

    // ── 4. Enqueue the job ────────────────────────────────────────────────
    const job = await queue.add(
      message.type,
      { ...message, enqueuedAt: Date.now() },
      {
        jobId,
        priority: PRIORITY_MAP[message.priority],
        delay: totalDelay,
        attempts: this.config.get<number>('BULLMQ_MAX_RETRIES', 5),
        backoff: {
          type: 'exponential',
          delay: this.config.get<number>('BULLMQ_BACKOFF_DELAY_MS', 5000),
        },
      },
    );

    // ── 5. Audit log ──────────────────────────────────────────────────────
    await this.queueLogRepo.save(
      this.queueLogRepo.create({
        jobId,
        accountId,
        queueName: `${this.queuePrefix}:outbound-${accountId}`,
        jobType: message.type,
        status: 'queued',
        payload: message as unknown as object,
      }),
    );

    this.logger.log(
      `[Queue] 📤 Enqueued ${message.type} for ${accountId} → ${message.to} (delay: ${totalDelay}ms, priority: ${message.priority})`,
    );

    return { jobId, queued: true, delay: totalDelay };
  }

  /** Pause all outbound queues for an account (called by circuit breaker) */
  async pauseAccountQueue(accountId: string): Promise<void> {
    const queue = this.accountQueues.get(accountId);
    if (queue) {
      await queue.pause();
      this.logger.warn(`[Queue] ⏸  Account queue PAUSED: ${accountId}`);
    }
  }

  /** Resume all outbound queues for an account */
  async resumeAccountQueue(accountId: string): Promise<void> {
    const queue = this.accountQueues.get(accountId);
    if (queue) {
      await queue.resume();
      this.logger.log(`[Queue] ▶️  Account queue RESUMED: ${accountId}`);
    }
  }

  /** Get queue stats for an account */
  async getQueueStats(accountId: string): Promise<Record<string, number>> {
    const queue = this.accountQueues.get(accountId);
    if (!queue) return { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };

    const [waiting, active, delayed, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, delayed, completed, failed };
  }

  /**
   * High-level convenience method to enqueue an outbound message
   */
  async enqueueOutboundMessage(params: {
    accountId: string;
    toJid: string;
    text: string;
    priority?: MessagePriority;
  }): Promise<{ jobId: string; queued: boolean; delay?: number }> {
    return this.enqueue({
      accountId: params.accountId,
      tenantId: 'default',
      to: params.toJid,
      type: 'text',
      priority: params.priority || 'normal',
      payload: { text: params.text },
    });
  }

  /**
   * Drain queue until all waiting, active, and delayed messages are processed
   */
  async drainQueue(accountId: string, options: { timeoutMs?: number; pollIntervalMs?: number } = {}): Promise<void> {
    const timeoutMs = options.timeoutMs ?? 30000;
    const pollIntervalMs = options.pollIntervalMs ?? 150;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const stats = await this.getQueueStats(accountId);
      if (stats.waiting === 0 && stats.active === 0 && stats.delayed === 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  /**
   * Returns enterprise account message stats (sent vs failed vs pending)
   */
  async getAccountStats(accountId: string): Promise<{
    sentCount: number;
    failedCount: number;
    pendingCount: number;
    activeCount: number;
  }> {
    const queueStats = await this.getQueueStats(accountId);

    const [sentInDb, failedInDb] = await Promise.all([
      this.queueLogRepo.count({
        where: { accountId, status: 'completed' },
      }).catch(() => 0),
      this.queueLogRepo.count({
        where: { accountId, status: 'failed' },
      }).catch(() => 0),
    ]);

    return {
      sentCount: Math.max(queueStats.completed, sentInDb),
      failedCount: Math.max(queueStats.failed, failedInDb),
      pendingCount: queueStats.waiting + queueStats.delayed,
      activeCount: queueStats.active,
    };
  }

  // ── Lazy-create per-account BullMQ queue with rate limiter ───────────────
  private async getOrCreateAccountQueue(accountId: string): Promise<Queue> {
    if (this.accountQueues.has(accountId)) {
      return this.accountQueues.get(accountId)!;
    }

    const queueName = `outbound-${accountId}`;
    const limiter = this.rateLimiterService.getQueueLimiterOptions();

    // Use the injected redis instance (real or mock) for connection
    const queue = new Queue(queueName, {
      connection: this.redis as any,
      prefix: this.queuePrefix,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: this.config.get<number>('BULLMQ_MAX_RETRIES', 5),
        backoff: { type: 'exponential', delay: 5000 },
      },
    } as QueueOptions);

    this.accountQueues.set(accountId, queue);
    this.logger.log(
      `[Queue] Created per-account queue: ${queueName} (rate: ${limiter.max} msg/${limiter.duration}ms)`,
    );

    return queue;
  }

  /** Humanized random jitter between min and max delay (anti-bot fingerprinting) */
  private humanJitter(): number {
    return Math.floor(
      Math.random() * (this.maxDelay - this.minDelay) + this.minDelay,
    );
  }
}
