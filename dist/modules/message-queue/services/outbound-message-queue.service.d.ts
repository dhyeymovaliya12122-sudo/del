import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { MessageQueueLogEntity } from '../entities/message-queue-log.entity';
import { QueueRateLimiterService } from './queue-rate-limiter.service';
import { ProxyCircuitBreakerService } from '../../proxy-circuit-breaker/services/proxy-circuit-breaker.service';
export type MessagePriority = 'urgent' | 'normal' | 'bulk';
export type MessageJobType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'template';
export interface OutboundMessageJob {
    accountId: string;
    tenantId: string;
    to: string;
    type: MessageJobType;
    priority: MessagePriority;
    payload: {
        text?: string;
        mediaObjectId?: string;
        caption?: string;
        templateName?: string;
        templateParams?: string[];
    };
    metadata?: Record<string, unknown>;
    traceId?: string;
    spanId?: string;
}
export declare class OutboundMessageQueueService {
    private readonly defaultQueue;
    private readonly redis;
    private readonly queueLogRepo;
    private readonly rateLimiterService;
    private readonly circuitBreakerService;
    private readonly config;
    private readonly logger;
    private readonly accountQueues;
    private readonly queuePrefix;
    private readonly minDelay;
    private readonly maxDelay;
    private readonly concurrency;
    constructor(defaultQueue: Queue, redis: Redis, queueLogRepo: Repository<MessageQueueLogEntity>, rateLimiterService: QueueRateLimiterService, circuitBreakerService: ProxyCircuitBreakerService, config: ConfigService);
    enqueue(message: OutboundMessageJob): Promise<{
        jobId: string;
        queued: boolean;
        delay?: number;
    }>;
    pauseAccountQueue(accountId: string): Promise<void>;
    resumeAccountQueue(accountId: string): Promise<void>;
    getQueueStats(accountId: string): Promise<Record<string, number>>;
    enqueueOutboundMessage(params: {
        accountId: string;
        toJid: string;
        text: string;
        priority?: MessagePriority;
    }): Promise<{
        jobId: string;
        queued: boolean;
        delay?: number;
    }>;
    drainQueue(accountId: string, options?: {
        timeoutMs?: number;
        pollIntervalMs?: number;
    }): Promise<void>;
    getAccountStats(accountId: string): Promise<{
        sentCount: number;
        failedCount: number;
        pendingCount: number;
        activeCount: number;
    }>;
    private getOrCreateAccountQueue;
    private humanJitter;
}
