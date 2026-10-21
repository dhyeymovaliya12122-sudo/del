import { OutboundMessageQueueService, OutboundMessageJob } from '../services/outbound-message-queue.service';
import { QueueRateLimiterService } from '../services/queue-rate-limiter.service';
export declare class MessageQueueController {
    private readonly queueService;
    private readonly rateLimiterService;
    constructor(queueService: OutboundMessageQueueService, rateLimiterService: QueueRateLimiterService);
    sendMessage(body: OutboundMessageJob): Promise<{
        jobId: string;
        queued: boolean;
        delay?: number;
    }>;
    getQueueStats(accountId: string): Promise<Record<string, number>>;
    pauseQueue(accountId: string): Promise<{
        message: string;
    }>;
    resumeQueue(accountId: string): Promise<{
        message: string;
    }>;
    getRateLimits(): Promise<Record<string, number>>;
    getAccountRate(accountId: string): Promise<{
        accountId: string;
        currentRate: number;
        allowed: boolean;
        remaining: number;
    }>;
}
