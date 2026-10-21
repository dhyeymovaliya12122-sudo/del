// ─────────────────────────────────────────────────────────────────────────────
//  modules/message-queue/services/queue-rate-limiter.service.ts
//  Phase 2: Per-Account Rate Limiter using Redis Token Bucket
//
//  Algorithm: Sliding Window / Token Bucket in Redis
//    - Each account has a Redis key: wa:rate:<accountId>
//    - Every send operation consumes 1 token
//    - Tokens refill at BULLMQ_MAX_MSG_PER_SECOND rate per second
//    - If no tokens available, job is DELAYED (not dropped)
//
//  BullMQ native rate limiting is configured via queue limiter options:
//    { max: N, duration: 1000 } → N jobs per 1000ms per queue
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

@Injectable()
export class QueueRateLimiterService {
  private readonly logger = new Logger(QueueRateLimiterService.name);
  private readonly maxPerSecond: number;
  private readonly windowMs = 1000;  // 1 second sliding window

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {
    this.maxPerSecond = config.get<number>('BULLMQ_MAX_MSG_PER_SECOND', 3);
  }

  /**
   * Check rate limit for an account using Redis INCR + EXPIRE.
   * Uses a 1-second sliding window token bucket.
   *
   * @returns RateLimitResult with allowed flag and remaining tokens
   */
  async checkRateLimit(accountId: string): Promise<RateLimitResult> {
    const key = `wa:rate:${accountId}`;
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / this.windowMs)}`;

    // Atomic INCR + EXPIRE using Redis pipeline
    const pipeline = this.redis.pipeline();
    pipeline.incr(windowKey);
    pipeline.pexpire(windowKey, this.windowMs * 2);  // Keep 2 windows for safety
    const results = await pipeline.exec();

    const currentCount = (results?.[0]?.[1] as number) ?? 0;
    const allowed = currentCount <= this.maxPerSecond;
    const remaining = Math.max(0, this.maxPerSecond - currentCount);
    const resetInMs = this.windowMs - (now % this.windowMs);

    if (!allowed) {
      this.logger.debug(
        `[RateLimit] Account ${accountId} exceeded: ${currentCount}/${this.maxPerSecond} (reset in ${resetInMs}ms)`,
      );
    }

    return { allowed, remaining, resetInMs };
  }

  /**
   * Get BullMQ queue limiter options for a per-account queue.
   * Applied when creating dynamic per-account queues.
   */
  getQueueLimiterOptions(): { max: number; duration: number } {
    return {
      max: this.maxPerSecond,
      duration: this.windowMs,  // per 1000ms
    };
  }

  /** Get current message rate for an account (for monitoring) */
  async getCurrentRate(accountId: string): Promise<number> {
    const key = `wa:rate:${accountId}`;
    const windowKey = `${key}:${Math.floor(Date.now() / this.windowMs)}`;
    const count = await this.redis.get(windowKey);
    return parseInt(count ?? '0', 10);
  }

  /** Get all active rate limit keys (for monitoring dashboard) */
  async getActiveRateLimits(): Promise<Record<string, number>> {
    const keys = await this.redis.keys('wa:rate:*');
    const result: Record<string, number> = {};

    if (keys.length === 0) return result;

    const values = await this.redis.mget(...keys);
    keys.forEach((key, i) => {
      const accountId = key.replace(/^wa:rate:/, '').replace(/:\d+$/, '');
      result[accountId] = parseInt(values[i] ?? '0', 10);
    });

    return result;
  }
}
