// ─────────────────────────────────────────────────────────────────────────────
//  modules/message-queue/controllers/message-queue.controller.ts
//  REST endpoints for queue management and rate limit monitoring
// ─────────────────────────────────────────────────────────────────────────────
import {
  Controller, Get, Post, Body, Param, HttpCode, HttpStatus,
} from '@nestjs/common';
import { OutboundMessageQueueService, OutboundMessageJob } from '../services/outbound-message-queue.service';
import { QueueRateLimiterService } from '../services/queue-rate-limiter.service';

@Controller('message-queue')
export class MessageQueueController {
  constructor(
    private readonly queueService: OutboundMessageQueueService,
    private readonly rateLimiterService: QueueRateLimiterService,
  ) {}

  /** POST /api/v1/message-queue/send — Enqueue an outbound message */
  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendMessage(@Body() body: OutboundMessageJob) {
    return this.queueService.enqueue(body);
  }

  /** GET /api/v1/message-queue/:accountId/stats — Queue stats for an account */
  @Get(':accountId/stats')
  async getQueueStats(@Param('accountId') accountId: string) {
    return this.queueService.getQueueStats(accountId);
  }

  /** POST /api/v1/message-queue/:accountId/pause — Pause account queue */
  @Post(':accountId/pause')
  @HttpCode(HttpStatus.OK)
  async pauseQueue(@Param('accountId') accountId: string) {
    await this.queueService.pauseAccountQueue(accountId);
    return { message: `Queue paused for account ${accountId}` };
  }

  /** POST /api/v1/message-queue/:accountId/resume — Resume account queue */
  @Post(':accountId/resume')
  @HttpCode(HttpStatus.OK)
  async resumeQueue(@Param('accountId') accountId: string) {
    await this.queueService.resumeAccountQueue(accountId);
    return { message: `Queue resumed for account ${accountId}` };
  }

  /** GET /api/v1/message-queue/rate-limits — All active rate limits */
  @Get('rate-limits')
  async getRateLimits() {
    return this.rateLimiterService.getActiveRateLimits();
  }

  /** GET /api/v1/message-queue/:accountId/rate — Current rate for account */
  @Get(':accountId/rate')
  async getAccountRate(@Param('accountId') accountId: string) {
    const current = await this.rateLimiterService.getCurrentRate(accountId);
    const limit = await this.rateLimiterService.checkRateLimit(accountId);
    return { accountId, currentRate: current, allowed: limit.allowed, remaining: limit.remaining };
  }
}
