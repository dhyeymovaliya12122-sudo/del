import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MetaWebhookService } from '../services/meta-webhook.service';
export declare class MetaWebhookController {
    private readonly metaWebhookService;
    private readonly config;
    private readonly logger;
    constructor(metaWebhookService: MetaWebhookService, config: ConfigService);
    verify(mode: string, token: string, challenge: string, res: Response): Response<any, Record<string, any>>;
    receive(body: any): Promise<string>;
}
