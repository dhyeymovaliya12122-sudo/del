import { CampaignsService, CreateCampaignDto, BulkRecipient } from '../services/campaigns.service';
export declare class CampaignsController {
    private readonly campaignsService;
    constructor(campaignsService: CampaignsService);
    findAll(accountId?: string): Promise<import("../entities/campaign.entity").CampaignEntity[]>;
    findOne(id: string): Promise<import("../entities/campaign.entity").CampaignEntity>;
    create(dto: CreateCampaignDto): Promise<import("../entities/campaign.entity").CampaignEntity>;
    addRecipients(id: string, recipients: BulkRecipient[]): Promise<{
        added: number;
    }>;
    getRecipients(id: string): Promise<any[]>;
    getStats(id: string): Promise<import("../entities/campaign.entity").CampaignEntity>;
    updateStatus(id: string, status: string): Promise<void>;
    sendNow(id: string): Promise<void>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
