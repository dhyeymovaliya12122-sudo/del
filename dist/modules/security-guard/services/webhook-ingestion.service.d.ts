import { Repository } from 'typeorm';
import { WebhookIngestionLogEntity } from '../entities/webhook-ingestion-log.entity';
export interface WhatsAppWebhookPayload {
    object: string;
    entry: Array<{
        id: string;
        changes: Array<{
            value: {
                messaging_product: string;
                metadata: {
                    phone_number_id: string;
                };
                messages?: any[];
                statuses?: any[];
            };
            field: string;
        }>;
    }>;
}
export declare class WebhookIngestionService {
    private readonly logRepo;
    private readonly logger;
    constructor(logRepo: Repository<WebhookIngestionLogEntity>);
    processWebhook(payload: WhatsAppWebhookPayload, sourceIp: string): Promise<void>;
    logRejectedWebhook(payload: object, sourceIp: string, eventType?: string): Promise<void>;
}
