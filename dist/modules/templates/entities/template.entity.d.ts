export type TemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type TemplateCategory = 'marketing' | 'utility' | 'authentication';
export declare class TemplateEntity {
    id: string;
    accountId: string;
    name: string;
    category: TemplateCategory;
    language: string;
    body: string;
    header?: string;
    footer?: string;
    buttons: string;
    status: TemplateStatus;
    metaTemplateId?: string;
    rejectionReason?: string;
    submittedAt?: Date;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
