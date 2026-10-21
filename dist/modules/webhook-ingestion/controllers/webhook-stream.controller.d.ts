import { RedisStreamPublisherService } from '../services/redis-stream-publisher.service';
import { RedisStreamConsumerService } from '../services/redis-stream-consumer.service';
export declare class WebhookStreamController {
    private readonly publisher;
    private readonly consumer;
    constructor(publisher: RedisStreamPublisherService, consumer: RedisStreamConsumerService);
    receiveWebhook(tenantId: string, accountId: string, body: object, hmacSignature: string): Promise<{
        status: string;
        buffered: boolean;
    }>;
    verifyWebhook(mode: string, challenge: string, verifyToken: string): string;
    getStreamHealth(): Promise<{
        lag: number;
        length: number;
        groups: number;
    }>;
}
