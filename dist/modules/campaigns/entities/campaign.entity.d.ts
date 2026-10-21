export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
export declare class CampaignEntity {
    id: string;
    accountId: string;
    name: string;
    templateId?: string;
    contactGroupId?: string;
    status: CampaignStatus;
    messageBody?: string;
    mediaUrl?: string;
    mediaType?: string;
    scheduledAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    repliedCount: number;
    failedCount: number;
    clickedCount: number;
    createdAt: Date;
    updatedAt: Date;
}
