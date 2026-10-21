export declare class ConversationMemoryEntity {
    id: string;
    accountId: string;
    senderJid: string;
    summary: string;
    keyFacts: Record<string, any>;
    sessionCount: number;
    createdAt: Date;
    updatedAt: Date;
}
