export declare class WhatsappMessageEntity {
    id: string;
    accountId: string;
    chatJid: string;
    senderJid: string;
    senderName?: string;
    fromMe: boolean;
    text: string;
    mediaType?: string;
    mediaUrl?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    status: string;
    isDeleted: boolean;
    isViewOnce: boolean;
    isEdited: boolean;
    reaction?: string;
    isStarred: boolean;
    quotedMsgId?: string;
    quotedText?: string;
    quotedSender?: string;
    timestamp: number;
    createdAt: Date;
}
