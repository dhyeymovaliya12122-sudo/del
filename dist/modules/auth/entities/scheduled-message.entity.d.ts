export declare enum ScheduleRepeat {
    ONCE = "once",
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly"
}
export declare class ScheduledMessageEntity {
    id: string;
    accountId: string;
    toJid: string;
    messageText: string;
    mediaPath: string;
    mediaType: string;
    caption: string;
    scheduledAt: Date;
    repeatType: ScheduleRepeat;
    sentAt: Date;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    createdAt: Date;
}
