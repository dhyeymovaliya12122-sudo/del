"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageQueueModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const message_queue_log_entity_1 = require("./entities/message-queue-log.entity");
const outbound_message_queue_service_1 = require("./services/outbound-message-queue.service");
const message_queue_worker_1 = require("./workers/message-queue.worker");
const queue_rate_limiter_service_1 = require("./services/queue-rate-limiter.service");
const message_queue_controller_1 = require("./controllers/message-queue.controller");
const session_hydration_module_1 = require("../session-hydration/session-hydration.module");
const whatsapp_account_entity_1 = require("../session-hydration/entities/whatsapp-account.entity");
const proxy_circuit_breaker_module_1 = require("../proxy-circuit-breaker/proxy-circuit-breaker.module");
const message_queue_service_1 = require("./services/message-queue.service");
let MessageQueueModule = class MessageQueueModule {
};
exports.MessageQueueModule = MessageQueueModule;
exports.MessageQueueModule = MessageQueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([message_queue_log_entity_1.MessageQueueLogEntity, whatsapp_account_entity_1.WhatsappAccountEntity]),
            bullmq_1.BullModule.registerQueueAsync({
                name: 'outbound-messages',
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    prefix: config.get('BULLMQ_QUEUE_PREFIX', 'wa'),
                    defaultJobOptions: {
                        removeOnComplete: 200,
                        removeOnFail: 100,
                        attempts: config.get('BULLMQ_MAX_RETRIES', 5),
                        backoff: {
                            type: 'exponential',
                            delay: config.get('BULLMQ_BACKOFF_DELAY_MS', 5000),
                        },
                    },
                }),
            }),
            session_hydration_module_1.SessionHydrationModule,
            proxy_circuit_breaker_module_1.ProxyCircuitBreakerModule,
        ],
        controllers: [message_queue_controller_1.MessageQueueController],
        providers: [
            outbound_message_queue_service_1.OutboundMessageQueueService,
            message_queue_service_1.MessageQueueService,
            message_queue_worker_1.MessageQueueWorker,
            queue_rate_limiter_service_1.QueueRateLimiterService,
        ],
        exports: [outbound_message_queue_service_1.OutboundMessageQueueService, message_queue_service_1.MessageQueueService],
    })
], MessageQueueModule);
//# sourceMappingURL=message-queue.module.js.map