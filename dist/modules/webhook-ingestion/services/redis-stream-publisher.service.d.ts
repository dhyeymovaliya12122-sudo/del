import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
export interface WebhookStreamEntry {
    tenantId: string;
    accountId: string;
    eventType: string;
    rawPayload: object;
    hmacSignature?: string;
}
export interface PublishResult {
    streamId: string;
    streamLen: number;
}
export declare class RedisStreamPublisherService {
    private readonly redis;
    private readonly config;
    private readonly logger;
    private readonly streamKey;
    private readonly maxStreamLen;
    private readonly instanceId;
    constructor(redis: Redis, config: ConfigService);
    publish(entry: WebhookStreamEntry): Promise<PublishResult>;
    ensureConsumerGroup(groupName: string): Promise<void>;
    getStreamInfo(): Promise<{
        length: number;
        groups: number;
    }>;
    get streamKeyName(): string;
}
