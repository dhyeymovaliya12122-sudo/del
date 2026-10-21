export type MigrationStatus = 'pending' | 'in_progress' | 'verified' | 'completed' | 'failed';
export declare class MigrationEntity {
    id: string;
    accountId: string;
    sourcePhoneNumber: string;
    sourceProvider?: string;
    status: MigrationStatus;
    stepsCompleted: number;
    contactsImported: number;
    templatesImported: number;
    messagesImported: number;
    testMessagesSent: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
