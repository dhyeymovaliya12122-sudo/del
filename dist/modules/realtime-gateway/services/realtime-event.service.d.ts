import { RealtimeGateway } from '../gateways/realtime.gateway';
export interface IncomingMessageEvent {
    messageId: string;
    from: string;
    to: string;
    body?: string;
    mediaObjectId?: string;
    mediaType?: string;
    timestamp: number;
}
export interface DeliveryStatusEvent {
    messageId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: number;
}
export interface MediaReadyEvent {
    messageId: string;
    mediaObjectId: string;
    mediaType: string;
    presignedUrl: string;
    cdnUrl?: string;
}
export declare class RealtimeEventService {
    readonly gateway: RealtimeGateway;
    private readonly logger;
    constructor(gateway: RealtimeGateway);
    emitToAccount(tenantId: string, accountId: string, event: string, payload: unknown): void;
    emitToTenant(tenantId: string, event: string, payload: unknown): void;
    emitIncomingMessage(tenantId: string, accountId: string, event: IncomingMessageEvent): void;
    emitDeliveryStatus(tenantId: string, accountId: string, event: DeliveryStatusEvent): void;
    emitMediaReady(tenantId: string, accountId: string, event: MediaReadyEvent): void;
    emitCircuitBreakerAlert(tenantId: string, accountId: string, proxyId: string, state: string): void;
    emitQRCode(tenantId: string, accountId: string, qrCodeDataUrl: string): void;
}
