import { Repository } from 'typeorm';
import { ConversationMemoryEntity } from '../../chatbot/entities/conversation-memory.entity';
import { CampaignRecipientEntity } from '../../campaigns/entities/campaign-recipient.entity';
import { ContactGroupMemberEntity } from '../entities/contact-group-member.entity';
export declare class ContactScorerService {
    private readonly memRepo;
    private readonly recRepo;
    private readonly memberRepo;
    private readonly logger;
    constructor(memRepo: Repository<ConversationMemoryEntity>, recRepo: Repository<CampaignRecipientEntity>, memberRepo: Repository<ContactGroupMemberEntity>);
    scoreContact(accountId: string, senderJid: string): Promise<number>;
    scoreGroup(accountId: string, groupId: string): Promise<{
        updated: number;
    }>;
    updateContactScore(memberId: string, score: number): Promise<void>;
}
