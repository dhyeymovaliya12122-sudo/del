export declare class WhatsappChatEntity {
    id: string;
    accountId: string;
    name: string;
    subtitle?: string;
    isGroup: boolean;
    unreadCount: number;
    lastMessageText: string;
    lastMessageTimestamp: number;
    lastMessageStatus: string;
    lastMessageFromMe: boolean;
    pinned: boolean;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}
