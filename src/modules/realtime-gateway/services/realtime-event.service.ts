// ─────────────────────────────────────────────────────────────────────────────
//  modules/realtime-gateway/services/realtime-event.service.ts
//  Phase 2: Facade for emitting typed events to tenant-scoped rooms.
//
//  All outbound message events, delivery status updates, and media
//  notifications are routed through this service so other modules
//  never import the gateway directly.
//
//  Pub/Sub channel format:
//    tenant:{tenantId}:account:{accountId}:messages  → message events
//    tenant:{tenantId}:account:{accountId}:status    → delivery receipts
//    tenant:{tenantId}:account:{accountId}:media     → media notifications
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class RealtimeEventService {
  private readonly logger = new Logger(RealtimeEventService.name);

  constructor(public readonly gateway: RealtimeGateway) {}

  emitToAccount(tenantId: string, accountId: string, event: string, payload: unknown): void {
    this.gateway.emitToAccount(tenantId, accountId, event, payload);
  }

  emitToTenant(tenantId: string, event: string, payload: unknown): void {
    this.gateway.emitToTenant(tenantId, event, payload);
  }

  /** Broadcast incoming WhatsApp message to tenant WebSocket room */
  emitIncomingMessage(
    tenantId: string,
    accountId: string,
    event: IncomingMessageEvent,
  ): void {
    this.gateway.emitToAccount(tenantId, accountId, 'message:incoming', event);
    this.logger.debug(
      `[WS] message:incoming → tenant:${tenantId} account:${accountId}`,
    );
  }

  /** Broadcast delivery status update */
  emitDeliveryStatus(
    tenantId: string,
    accountId: string,
    event: DeliveryStatusEvent,
  ): void {
    const room = `tenant:${tenantId}:account:${accountId}:status`;
    this.gateway.server?.to(room).emit('message:status', event);
  }

  /** Broadcast media-ready notification (R2 upload complete) */
  emitMediaReady(
    tenantId: string,
    accountId: string,
    event: MediaReadyEvent,
  ): void {
    const room = `tenant:${tenantId}:account:${accountId}:media`;
    this.gateway.server?.to(room).emit('media:ready', event);
    this.logger.debug(
      `[WS] media:ready → messageId: ${event.messageId}`,
    );
  }

  /** Broadcast circuit breaker open alert to tenant */
  emitCircuitBreakerAlert(
    tenantId: string,
    accountId: string,
    proxyId: string,
    state: string,
  ): void {
    this.gateway.emitToTenant(tenantId, 'proxy:circuit-breaker', {
      accountId,
      proxyId,
      state,
      timestamp: Date.now(),
    });
  }

  /** Broadcast QR code for WhatsApp Web account linking */
  emitQRCode(
    tenantId: string,
    accountId: string,
    qrCodeDataUrl: string,
  ): void {
    this.gateway.emitToAccount(tenantId, accountId, 'whatsapp.qr', {
      accountId,
      qrCodeDataUrl,
      timestamp: Date.now(),
    });
    this.logger.debug(
      `[WS] whatsapp.qr → tenant:${tenantId} account:${accountId}`,
    );
  }
}
