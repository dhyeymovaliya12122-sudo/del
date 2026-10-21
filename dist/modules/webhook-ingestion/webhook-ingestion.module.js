"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookIngestionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const webhook_stream_controller_1 = require("./controllers/webhook-stream.controller");
const meta_webhook_controller_1 = require("./controllers/meta-webhook.controller");
const redis_stream_publisher_service_1 = require("./services/redis-stream-publisher.service");
const redis_stream_consumer_service_1 = require("./services/redis-stream-consumer.service");
const meta_webhook_service_1 = require("./services/meta-webhook.service");
const stream_checkpoint_entity_1 = require("./entities/stream-checkpoint.entity");
const webhook_ingestion_log_entity_1 = require("../security-guard/entities/webhook-ingestion-log.entity");
const whatsapp_message_entity_1 = require("../session-hydration/entities/whatsapp-message.entity");
const whatsapp_chat_entity_1 = require("../session-hydration/entities/whatsapp-chat.entity");
const whatsapp_contact_entity_1 = require("../session-hydration/entities/whatsapp-contact.entity");
const whatsapp_account_entity_1 = require("../session-hydration/entities/whatsapp-account.entity");
const realtime_gateway_module_1 = require("../realtime-gateway/realtime-gateway.module");
let WebhookIngestionModule = class WebhookIngestionModule {
};
exports.WebhookIngestionModule = WebhookIngestionModule;
exports.WebhookIngestionModule = WebhookIngestionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                stream_checkpoint_entity_1.StreamCheckpointEntity,
                webhook_ingestion_log_entity_1.WebhookIngestionLogEntity,
                whatsapp_message_entity_1.WhatsappMessageEntity,
                whatsapp_chat_entity_1.WhatsappChatEntity,
                whatsapp_contact_entity_1.WhatsappContactEntity,
                whatsapp_account_entity_1.WhatsappAccountEntity,
            ]),
            realtime_gateway_module_1.RealtimeGatewayModule,
        ],
        controllers: [
            webhook_stream_controller_1.WebhookStreamController,
            meta_webhook_controller_1.MetaWebhookController,
        ],
        providers: [
            redis_stream_publisher_service_1.RedisStreamPublisherService,
            redis_stream_consumer_service_1.RedisStreamConsumerService,
            meta_webhook_service_1.MetaWebhookService,
        ],
        exports: [redis_stream_publisher_service_1.RedisStreamPublisherService, meta_webhook_service_1.MetaWebhookService],
    })
], WebhookIngestionModule);
//# sourceMappingURL=webhook-ingestion.module.js.map