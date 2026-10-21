// ─────────────────────────────────────────────────────────────────────────────
//  modules/webhook-ingestion/controllers/meta-webhook.controller.ts
//  Meta WhatsApp Cloud API Webhook Controller
//
//  Mounted at /webhook (outside the global api/v1 prefix)
//
//  GET  /webhook  → Meta verification handshake
//  POST /webhook  → Meta event ingestion (messages, status updates)
// ─────────────────────────────────────────────────────────────────────────────
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { MetaWebhookService } from '../services/meta-webhook.service';
import { Public } from '../../../common/decorators/public.decorator';

@Public()
@SkipThrottle()
@Controller('webhook')
export class MetaWebhookController {
  private readonly logger = new Logger(MetaWebhookController.name);

  constructor(
    private readonly metaWebhookService: MetaWebhookService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /webhook
   * Meta verification handshake.
   * Meta sends hub.mode=subscribe, hub.verify_token, hub.challenge.
   * We must respond with hub.challenge if the token matches.
   */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get<string>('META_WEBHOOK_VERIFY_TOKEN', 'whatsapp_verify_token_2024');
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('✅ Meta webhook verified successfully');
      return res.status(HttpStatus.OK).send(challenge);
    }
    this.logger.warn(`❌ Meta webhook verification failed (token mismatch). Received: "${token}"`);
    return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  /**
   * POST /webhook
   * Receives incoming messages and status updates from Meta.
   * Must return 200 immediately; processing is done asynchronously.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(@Body() body: any): Promise<string> {
    // Respond immediately — Meta requires a 200 within 20s
    this.metaWebhookService.processPayload(body).catch(err =>
      this.logger.error(`Webhook processing error: ${err.message}`, err.stack)
    );
    return 'EVENT_RECEIVED';
  }
}
