export declare class AutoReplyRuleEntity {
    id: string;
    accountId: string;
    name: string;
    triggerType: 'keyword' | 'regex' | 'new_contact' | 'any' | 'contains';
    triggerValue: string;
    replyMessage: string;
    isActive: boolean;
    onlyOutsideHours: boolean;
    businessHoursStart: string;
    businessHoursEnd: string;
    matchCount: number;
    replyCount: number;
    createdAt: Date;
    updatedAt: Date;
}
