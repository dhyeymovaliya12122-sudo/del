// ─────────────────────────────────────────────────────────────────────────────
//  modules/security-guard/security-guard.module.ts
//  Feature 3: Security & Ingestion Guard
//
//  Responsibilities:
//  1. Validate X-Hub-Signature-256 HMAC on all incoming webhooks
//  2. Discard unauthorized requests at the NestJS edge (before processing)
//  3. Log all webhook ingestion attempts to the database
//  4. Provide Cloudflare WAF integration helpers
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookIngestionLogEntity } from './entities/webhook-ingestion-log.entity';
import { HmacValidationGuard } from './guards/hmac-validation.guard';
import { WebhookIngestionService } from './services/webhook-ingestion.service';
import { CloudflareWafService } from './services/cloudflare-waf.service';
import { WebhookController } from './controllers/webhook.controller';
import { SessionHydrationModule } from '../session-hydration/session-hydration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookIngestionLogEntity]),
    SessionHydrationModule,  // For processing webhook-triggered events
  ],
  controllers: [WebhookController],
  providers: [
    HmacValidationGuard,        // NestJS Guard: validates X-Hub-Signature-256
    WebhookIngestionService,    // Processes and logs verified webhook payloads
    CloudflareWafService,       // Cloudflare WAF rule management
  ],
  exports: [HmacValidationGuard],
})
export class SecurityGuardModule {}
