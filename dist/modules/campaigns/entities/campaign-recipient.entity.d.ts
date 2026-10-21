export type RecipientStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | 'opted_out';
export declare class CampaignRecipientEntity {
    id: string;
    campaignId: string;
    phoneNumber: string;
    name?: string;
    status: RecipientStatus;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    repliedAt?: Date;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}
