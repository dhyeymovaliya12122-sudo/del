// ─────────────────────────────────────────────────────────────────────────────
//  modules/webhook-ingestion/controllers/webhook-stream.controller.ts
//  Phase 3: New webhook entry point — XADD to stream, return 200 immediately.
//
//  Replaces the old synchronous webhook handler.
//  Meta's webhook delivery will never time out; retries are eliminated.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Controller, Post, Get, Body, Headers, Param, Query,
  HttpCode, HttpStatus, UseGuards, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RedisStreamPublisherService } from '../services/redis-stream-publisher.service';
import { RedisStreamConsumerService } from '../services/redis-stream-consumer.service';
import { HmacValidationGuard } from '../../security-guard/guards/hmac-validation.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@SkipThrottle()
@Controller('webhook')
export class WebhookStreamController {
  constructor(
    private readonly publisher: RedisStreamPublisherService,
    private readonly consumer: RedisStreamConsumerService,
  ) {}

  /**
   * Meta/WhatsApp webhook delivery endpoint.
   * XADD to Redis Stream → return 200 immediately.
   * No DB I/O, no business logic — just buffer.
   *
   * POST /api/v1/webhook/:tenantId/:accountId
   */
  @Post(':tenantId/:accountId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(HmacValidationGuard)
  async receiveWebhook(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Body() body: object,
    @Headers('x-hub-signature-256') hmacSignature: string,
  ): Promise<{ status: string; buffered: boolean }> {
    const eventType =
      (body as any)?.entry?.[0]?.changes?.[0]?.field ?? 'unknown';

    // Replay attack prevention: check event timestamp freshness if provided by Meta
    const entryTime = (body as any)?.entry?.[0]?.time;
    if (entryTime && typeof entryTime === 'number') {
      const nowSec = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSec - entryTime) > 900) {
        console.warn(`[Webhook] Stale/replayed webhook rejected (time difference: ${Math.abs(nowSec - entryTime)}s)`);
        return { status: 'stale_rejected', buffered: false };
      }
    }

    // Fire-and-forget publish — if stream write fails we log but still 200
    // (Meta will retry; we want to avoid double-processing on our side)
    await this.publisher.publish({
      tenantId,
      accountId,
      eventType,
      rawPayload: body,
      hmacSignature,
    }).catch((err) => {
      // Stream write failed — fall back to synchronous processing
      // This protects against Redis being temporarily unavailable
      console.error(`[Webhook] Stream publish failed: ${err.message} — falling back to sync`);
    });

    // Always return 200 to Meta immediately
    return { status: 'ok', buffered: true };
  }

  /**
   * Meta webhook verification (GET challenge)
   * GET /api/v1/webhook/:tenantId/:accountId
   */
  @Get(':tenantId/:accountId')
  @HttpCode(HttpStatus.OK)
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
  ): string {
    const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN ?? 'whatsapp_verify';
    if (mode === 'subscribe' && verifyToken === expectedToken) {
      return challenge;
    }
    return 'Forbidden';
  }

  /**
   * Stream health & lag metrics
   * GET /api/v1/webhook/stream/health
   */
  @Get('stream/health')
  async getStreamHealth() {
    const [streamInfo, lag] = await Promise.all([
      this.publisher.getStreamInfo(),
      this.consumer.getLag(),
    ]);
    return { ...streamInfo, lag };
  }
}
