// ─────────────────────────────────────────────────────────────────────────────
//  modules/security-guard/services/webhook-ingestion.service.ts
//  Processes validated webhook payloads and logs them to the database.
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookIngestionLogEntity } from '../entities/webhook-ingestion-log.entity';

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string };
        messages?: any[];
        statuses?: any[];
      };
      field: string;
    }>;
  }>;
}

@Injectable()
export class WebhookIngestionService {
  private readonly logger = new Logger(WebhookIngestionService.name);

  constructor(
    @InjectRepository(WebhookIngestionLogEntity)
    private readonly logRepo: Repository<WebhookIngestionLogEntity>,
  ) {}

  /**
   * Process a validated webhook payload.
   * HMAC has already been verified by HmacValidationGuard at this point.
   */
  async processWebhook(
    payload: WhatsAppWebhookPayload,
    sourceIp: string,
  ): Promise<void> {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const eventType = change.field;
        const accountId = change.value?.metadata?.phone_number_id;

        // Log to database
        await this.logRepo.save(
          this.logRepo.create({
            accountId,
            eventType,
            payload: change.value as object,
            hmacValid: true,
            sourceIp,
          }),
        );

        // Route to appropriate handler based on event type
        if (change.value?.messages?.length) {
          this.logger.log(`📨 Incoming message for account ${accountId}`);
          // TODO: emit to message processing queue (Phase 2)
        }

        if (change.value?.statuses?.length) {
          this.logger.debug(`📊 Status update for account ${accountId}`);
          // TODO: update message delivery status (Phase 2)
        }
      }
    }
  }

  /** Log rejected (invalid HMAC) webhook attempt */
  async logRejectedWebhook(
    payload: object,
    sourceIp: string,
    eventType = 'REJECTED_INVALID_HMAC',
  ): Promise<void> {
    await this.logRepo.save(
      this.logRepo.create({
        eventType,
        payload,
        hmacValid: false,
        sourceIp,
      }),
    );
  }
}
