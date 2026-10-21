// ─────────────────────────────────────────────────────────────────────────────
//  app.module.ts — Root Application Module
//  Wires together: Config, Database, Cache, ProxyBinding,
//  SessionHydration, SecurityGuard modules.
// ─────────────────────────────────────────────────────────────────────────────
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
// Phase 1
import { ProxyBindingModule } from './modules/proxy-binding/proxy-binding.module';
import { SessionHydrationModule } from './modules/session-hydration/session-hydration.module';
import { SecurityGuardModule } from './modules/security-guard/security-guard.module';
import { HealthModule } from './modules/health/health.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
// Phase 2
import { ProxyCircuitBreakerModule } from './modules/proxy-circuit-breaker/proxy-circuit-breaker.module';
import { MediaPipelineModule } from './modules/media-pipeline/media-pipeline.module';
import { RealtimeGatewayModule } from './modules/realtime-gateway/realtime-gateway.module';
import { MessageQueueModule } from './modules/message-queue/message-queue.module';
// Phase 3
import { WebhookIngestionModule } from './modules/webhook-ingestion/webhook-ingestion.module';
import { OrchestrationModule } from './modules/orchestration/orchestration.module';
import { AccountsModule } from './modules/accounts/accounts.module';
// Phase 4 — Marketing & Business Features
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { OptOutModule } from './modules/opt-out/opt-out.module';
import { MigrationModule } from './modules/migration/migration.module';
import { VerificationModule } from './modules/verification/verification.module';
import { AuthModule } from './modules/auth/auth.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import proxyConfig from './config/proxy.config';
import securityConfig from './config/security.config';
import bullmqConfig from './config/bullmq.config';
import r2Config from './config/r2.config';
import aiFeaturesConfig from './config/ai-features.config';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, proxyConfig, securityConfig, bullmqConfig, r2Config, aiFeaturesConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Global Utilities ──────────────────────────────────────────────────
    ScheduleModule.forRoot(),           // @Cron / @Interval decorators
    EventEmitterModule.forRoot(),       // Cross-module event bus
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60_000,    // 1 minute
      limit: 1000,    // 1000 requests per minute general
    }]),

    // ── BullMQ Global Connection ──────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isMock = config.get<boolean>('redis.mock', false);
        const isProd = config.get<string>('NODE_ENV') === 'production';
        if (isMock && isProd) {
          console.error(
            '🚨 [BullMQ ERROR] BullMQ cannot run reliably with ioredis-mock in production! Queues and workers require a real Redis server.',
          );
        }
        // When REDIS_MOCK=true, use ioredis-mock as the BullMQ connection
        const connection = isMock
          ? new (require('ioredis-mock'))()
          : {
              host: config.get<string>('redis.host', 'localhost'),
              port: config.get<number>('redis.port', 6379),
              password: config.get<string>('redis.password') || undefined,
            };
        return {
          connection,
          prefix: config.get<string>('BULLMQ_QUEUE_PREFIX', 'wa'),
        };
      },
    }),

    // ── Infrastructure ─────────────────────────────────────────────────────
    DatabaseModule,
    CacheModule,

    // ── Phase 1 Feature Modules ────────────────────────────────────────────
    ProxyBindingModule,       // Per-account proxy routing
    SessionHydrationModule,   // Stateless auth hydration
    SecurityGuardModule,      // HMAC / Cloudflare WAF guard

    // ── Phase 2 Feature Modules ────────────────────────────────────────────
    ProxyCircuitBreakerModule,  // Circuit breaker + BullMQ queue pause
    MediaPipelineModule,        // Zero-egress R2 media pipeline
    RealtimeGatewayModule,      // Socket.io Redis adapter (multi-node WS)
    MessageQueueModule,         // BullMQ rate-limited outbound queues

    // ── Phase 3 Feature Modules ────────────────────────────────────────────
    WebhookIngestionModule,     // Redis Streams async ingestion buffer
    OrchestrationModule,        // Docker Swarm / Coolify container lifecycle
    AccountsModule,             // REST API for accounts (dashboard sidebar)

    // ── Phase 4 Marketing & Business Feature Modules ───────────────────────
    CampaignsModule,            // Bulk campaign management + delivery tracking
    ContactsModule,             // Contact groups + segmentation (city/lang/tags)
    ChatbotModule,              // Visual chatbot flow builder + keyword matching
    TemplatesModule,            // Meta-approved message template management
    OptOutModule,               // Compliance opt-out list management
    MigrationModule,            // Step-by-step account migration wizard
    VerificationModule,         // Green tick + Meta business verification tracker

    // ── Health & Telemetry Observability ─────────────────────────────────────
    HealthModule,
    TelemetryModule, // Pillar 5: Prometheus Enterprise Metrics & OpenTelemetry Tracing

    // ── Auth: Super Admin, Admins, Scheduler, Auto-Reply ──────────────────
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

