// ─────────────────────────────────────────────────────────────────────────────
//  modules/security-guard/controllers/webhook.controller.ts
//  Feature 3: Webhook Ingestion Endpoint
//
//  Routes:
//    GET  /api/v1/webhooks/whatsapp  — Meta webhook verification challenge
//    POST /api/v1/webhooks/whatsapp  — Receive webhook events (HMAC guarded)
//
//  The HmacValidationGuard runs BEFORE the POST handler.
//  Any request with an invalid X-Hub-Signature-256 is rejected with 401.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Controller, Get, Post, Body, Query, Req, Res,
  UseGuards, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { HmacValidationGuard } from '../guards/hmac-validation.guard';
import { WebhookIngestionService, WhatsAppWebhookPayload } from '../services/webhook-ingestion.service';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookIngestionService: WebhookIngestionService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /api/v1/webhooks/whatsapp
   * Meta webhook verification — returns hub.challenge when token matches.
   */
  @Get('whatsapp')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get<string>('security.webhookVerifyToken', '');

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('✅ Webhook verification challenge accepted');
      return res.status(200).send(challenge);
    }

    this.logger.warn(`❌ Webhook verification failed. Token mismatch.`);
    return res.status(403).send('Forbidden');
  }

  /**
   * POST /api/v1/webhooks/whatsapp
   * Receive WhatsApp webhook events.
   * Protected by HmacValidationGuard (X-Hub-Signature-256 must be valid).
   */
  @Post('whatsapp')
  @UseGuards(HmacValidationGuard)
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Body() payload: WhatsAppWebhookPayload,
    @Req() req: Request,
  ) {
    const sourceIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    this.logger.log(`📥 Webhook received from ${sourceIp}`);

    await this.webhookIngestionService.processWebhook(payload, sourceIp);

    // Return 200 immediately — Meta requires fast ACK
    return { status: 'accepted' };
  }
}
