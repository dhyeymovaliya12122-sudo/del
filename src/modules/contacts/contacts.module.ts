import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactGroupEntity } from './entities/contact-group.entity';
import { ContactGroupMemberEntity } from './entities/contact-group-member.entity';
import { ConversationMemoryEntity } from '../chatbot/entities/conversation-memory.entity';
import { CampaignRecipientEntity } from '../campaigns/entities/campaign-recipient.entity';
import { ContactsService } from './services/contacts.service';
import { ContactScorerService } from './services/contact-scorer.service';
import { ContactsController } from './controllers/contacts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContactGroupEntity,
      ContactGroupMemberEntity,
      ConversationMemoryEntity,
      CampaignRecipientEntity,
    ]),
  ],
  controllers: [ContactsController],
  providers: [ContactsService, ContactScorerService],
  exports: [ContactsService, ContactScorerService],
})
export class ContactsModule {}
