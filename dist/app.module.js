"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const correlation_id_middleware_1 = require("./common/middleware/correlation-id.middleware");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const event_emitter_1 = require("@nestjs/event-emitter");
const bullmq_1 = require("@nestjs/bullmq");
const throttler_1 = require("@nestjs/throttler");
const database_module_1 = require("./infrastructure/database/database.module");
const cache_module_1 = require("./infrastructure/cache/cache.module");
const proxy_binding_module_1 = require("./modules/proxy-binding/proxy-binding.module");
const session_hydration_module_1 = require("./modules/session-hydration/session-hydration.module");
const security_guard_module_1 = require("./modules/security-guard/security-guard.module");
const health_module_1 = require("./modules/health/health.module");
const telemetry_module_1 = require("./modules/telemetry/telemetry.module");
const proxy_circuit_breaker_module_1 = require("./modules/proxy-circuit-breaker/proxy-circuit-breaker.module");
const media_pipeline_module_1 = require("./modules/media-pipeline/media-pipeline.module");
const realtime_gateway_module_1 = require("./modules/realtime-gateway/realtime-gateway.module");
const message_queue_module_1 = require("./modules/message-queue/message-queue.module");
const webhook_ingestion_module_1 = require("./modules/webhook-ingestion/webhook-ingestion.module");
const orchestration_module_1 = require("./modules/orchestration/orchestration.module");
const accounts_module_1 = require("./modules/accounts/accounts.module");
const campaigns_module_1 = require("./modules/campaigns/campaigns.module");
const contacts_module_1 = require("./modules/contacts/contacts.module");
const chatbot_module_1 = require("./modules/chatbot/chatbot.module");
const templates_module_1 = require("./modules/templates/templates.module");
const opt_out_module_1 = require("./modules/opt-out/opt-out.module");
const migration_module_1 = require("./modules/migration/migration.module");
const verification_module_1 = require("./modules/verification/verification.module");
const auth_module_1 = require("./modules/auth/auth.module");
const app_config_1 = require("./config/app.config");
const database_config_1 = require("./config/database.config");
const redis_config_1 = require("./config/redis.config");
const proxy_config_1 = require("./config/proxy.config");
const security_config_1 = require("./config/security.config");
const bullmq_config_1 = require("./config/bullmq.config");
const r2_config_1 = require("./config/r2.config");
const ai_features_config_1 = require("./config/ai-features.config");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(correlation_id_middleware_1.CorrelationIdMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default, database_config_1.default, redis_config_1.default, proxy_config_1.default, security_config_1.default, bullmq_config_1.default, r2_config_1.default, ai_features_config_1.default],
                envFilePath: ['.env.local', '.env'],
            }),
            schedule_1.ScheduleModule.forRoot(),
            event_emitter_1.EventEmitterModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([{
                    name: 'default',
                    ttl: 60_000,
                    limit: 1000,
                }]),
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const isMock = config.get('redis.mock', false);
                    const isProd = config.get('NODE_ENV') === 'production';
                    if (isMock && isProd) {
                        console.error('🚨 [BullMQ ERROR] BullMQ cannot run reliably with ioredis-mock in production! Queues and workers require a real Redis server.');
                    }
                    const connection = isMock
                        ? new (require('ioredis-mock'))()
                        : {
                            host: config.get('redis.host', 'localhost'),
                            port: config.get('redis.port', 6379),
                            password: config.get('redis.password') || undefined,
                        };
                    return {
                        connection,
                        prefix: config.get('BULLMQ_QUEUE_PREFIX', 'wa'),
                    };
                },
            }),
            database_module_1.DatabaseModule,
            cache_module_1.CacheModule,
            proxy_binding_module_1.ProxyBindingModule,
            session_hydration_module_1.SessionHydrationModule,
            security_guard_module_1.SecurityGuardModule,
            proxy_circuit_breaker_module_1.ProxyCircuitBreakerModule,
            media_pipeline_module_1.MediaPipelineModule,
            realtime_gateway_module_1.RealtimeGatewayModule,
            message_queue_module_1.MessageQueueModule,
            webhook_ingestion_module_1.WebhookIngestionModule,
            orchestration_module_1.OrchestrationModule,
            accounts_module_1.AccountsModule,
            campaigns_module_1.CampaignsModule,
            contacts_module_1.ContactsModule,
            chatbot_module_1.ChatbotModule,
            templates_module_1.TemplatesModule,
            opt_out_module_1.OptOutModule,
            migration_module_1.MigrationModule,
            verification_module_1.VerificationModule,
            health_module_1.HealthModule,
            telemetry_module_1.TelemetryModule,
            auth_module_1.AuthModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map