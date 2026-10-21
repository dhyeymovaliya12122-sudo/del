import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetInMs: number;
}
export declare class QueueRateLimiterService {
    private readonly redis;
    private readonly config;
    private readonly logger;
    private readonly maxPerSecond;
    private readonly windowMs;
    constructor(redis: Redis, config: ConfigService);
    checkRateLimit(accountId: string): Promise<RateLimitResult>;
    getQueueLimiterOptions(): {
        max: number;
        duration: number;
    };
    getCurrentRate(accountId: string): Promise<number>;
    getActiveRateLimits(): Promise<Record<string, number>>;
}
