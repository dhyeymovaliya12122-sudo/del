// ─────────────────────────────────────────────────────────────────────────────
//  modules/webhook-ingestion/webhook-ingestion.module.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookStreamController } from './controllers/webhook-stream.controller';
import { MetaWebhookController } from './controllers/meta-webhook.controller';
import { RedisStreamPublisherService } from './services/redis-stream-publisher.service';
import { RedisStreamConsumerService } from './services/redis-stream-consumer.service';
import { MetaWebhookService } from './services/meta-webhook.service';
import { StreamCheckpointEntity } from './entities/stream-checkpoint.entity';
import { WebhookIngestionLogEntity } from '../security-guard/entities/webhook-ingestion-log.entity';
import { WhatsappMessageEntity } from '../session-hydration/entities/whatsapp-message.entity';
import { WhatsappChatEntity } from '../session-hydration/entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../session-hydration/entities/whatsapp-contact.entity';
import { WhatsappAccountEntity } from '../session-hydration/entities/whatsapp-account.entity';
import { RealtimeGatewayModule } from '../realtime-gateway/realtime-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StreamCheckpointEntity,
      WebhookIngestionLogEntity,
      WhatsappMessageEntity,
      WhatsappChatEntity,
      WhatsappContactEntity,
      WhatsappAccountEntity,
    ]),
    RealtimeGatewayModule,
  ],
  controllers: [
    WebhookStreamController,
    MetaWebhookController,   // GET/POST /webhook — Meta Cloud API
  ],
  providers: [
    RedisStreamPublisherService,   // Writes incoming webhooks to Redis Stream (XADD)
    RedisStreamConsumerService,    // Consumer group: drains stream, writes to DB (XACK)
    MetaWebhookService,            // Processes Meta Cloud API webhook payloads
  ],
  exports: [RedisStreamPublisherService, MetaWebhookService],
})
export class WebhookIngestionModule {}

