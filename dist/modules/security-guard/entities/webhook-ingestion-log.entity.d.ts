export declare class WebhookIngestionLogEntity {
    id: string;
    accountId?: string;
    eventType: string;
    payload: object;
    hmacValid: boolean;
    sourceIp?: string;
    processedAt: Date;
}
