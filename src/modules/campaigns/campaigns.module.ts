import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignEntity } from './entities/campaign.entity';
import { CampaignRecipientEntity } from './entities/campaign-recipient.entity';
import { WhatsappContactEntity } from '../session-hydration/entities/whatsapp-contact.entity';
import { CampaignsService } from './services/campaigns.service';
import { CampaignsController } from './controllers/campaigns.controller';
import { MessageQueueModule } from '../message-queue/message-queue.module';

import { SessionHydrationModule } from '../session-hydration/session-hydration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignEntity, CampaignRecipientEntity, WhatsappContactEntity]),
    MessageQueueModule,  // provides OutboundMessageQueueService for BullMQ dispatch
    SessionHydrationModule, // provides BaileysClientFactory for direct reliable WhatsApp dispatch
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}

