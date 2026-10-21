import { Repository } from 'typeorm';
import { CampaignEntity, CampaignStatus } from '../entities/campaign.entity';
import { CampaignRecipientEntity } from '../entities/campaign-recipient.entity';
import { WhatsappContactEntity } from '../../session-hydration/entities/whatsapp-contact.entity';
import { OutboundMessageQueueService } from '../../message-queue/services/outbound-message-queue.service';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
export interface CreateCampaignDto {
    accountId: string;
    name: string;
    messageBody?: string;
    templateId?: string;
    contactGroupId?: string;
    mediaUrl?: string;
    mediaType?: string;
    scheduledAt?: string;
}
export interface BulkRecipient {
    phoneNumber: string;
    name?: string;
}
export declare class CampaignsService {
    private readonly campaignRepo;
    private readonly recipientRepo;
    private readonly contactRepo;
    private readonly outboundQueue;
    private readonly baileysClientFactory?;
    private readonly logger;
    constructor(campaignRepo: Repository<CampaignEntity>, recipientRepo: Repository<CampaignRecipientEntity>, contactRepo: Repository<WhatsappContactEntity>, outboundQueue: OutboundMessageQueueService, baileysClientFactory?: BaileysClientFactory);
    findAll(accountId?: string): Promise<CampaignEntity[]>;
    findOne(id: string): Promise<CampaignEntity>;
    create(dto: CreateCampaignDto): Promise<CampaignEntity>;
    addRecipients(campaignId: string, recipients: BulkRecipient[]): Promise<{
        added: number;
    }>;
    getRecipients(campaignId: string): Promise<any[]>;
    updateStatus(id: string, status: CampaignStatus): Promise<void>;
    executeCampaign(campaignId: string): Promise<void>;
    updateStats(campaignId: string): Promise<void>;
    updateRecipientById(recipientId: string, status: CampaignRecipientEntity['status'], errorMessage?: string): Promise<void>;
    updateRecipientStatus(campaignId: string, phoneNumber: string, status: CampaignRecipientEntity['status']): Promise<void>;
    getStats(id: string): Promise<CampaignEntity>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
