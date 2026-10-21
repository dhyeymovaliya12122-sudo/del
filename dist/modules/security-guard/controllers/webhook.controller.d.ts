import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WebhookIngestionService, WhatsAppWebhookPayload } from '../services/webhook-ingestion.service';
export declare class WebhookController {
    private readonly webhookIngestionService;
    private readonly config;
    private readonly logger;
    constructor(webhookIngestionService: WebhookIngestionService, config: ConfigService);
    verifyWebhook(mode: string, token: string, challenge: string, res: Response): Response<any, Record<string, any>>;
    receiveWebhook(payload: WhatsAppWebhookPayload, req: Request): Promise<{
        status: string;
    }>;
}
