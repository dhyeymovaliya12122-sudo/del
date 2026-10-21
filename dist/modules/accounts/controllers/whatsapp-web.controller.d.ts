import { WhatsappWebService } from '../services/whatsapp-web.service';
export declare class WhatsappWebController {
    private readonly whatsappWebService;
    constructor(whatsappWebService: WhatsappWebService);
    getChats(accountId: string, search?: string, limit?: string, offset?: string, startDate?: string, endDate?: string): Promise<any>;
    getMessages(jid: string, accountId: string, limit?: string, startDate?: string, endDate?: string, search?: string, ghostMode?: string, ghostHeader?: string): Promise<import("../../session-hydration/entities/whatsapp-message.entity").WhatsappMessageEntity[]>;
    clearChatMessages(jid: string, accountId: string): Promise<{
        success: boolean;
        deletedCount: number;
    }>;
    getContacts(accountId: string, search?: string): Promise<import("../../session-hydration/entities/whatsapp-contact.entity").WhatsappContactEntity[]>;
    getMedia(accountId: string, filename: string, customName: string, download: string, res: any): Promise<void>;
    sendMessage(body: {
        accountId: string;
        to: string;
        text: string;
        quotedMsgId?: string;
    }): Promise<any>;
    sendVoice(body: {
        accountId: string;
        to: string;
        base64Data: string;
        quotedMsgId?: string;
    }): Promise<any>;
    sendReaction(body: {
        accountId: string;
        to: string;
        messageId: string;
        emoji: string;
        fromMe?: boolean;
    }): Promise<{
        success: boolean;
        messageId: string;
        reaction: string;
    }>;
    sendMedia(file: any, body: {
        accountId: string;
        to: string;
        fileName?: string;
        mimeType?: string;
        base64Data?: string;
        caption?: string;
    }): Promise<{
        id: any;
        accountId: string;
        chatJid: string;
        senderJid: string;
        fromMe: true;
        text: string;
        mediaType: string;
        mediaUrl: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        status: string;
        timestamp: number;
    } & import("../../session-hydration/entities/whatsapp-message.entity").WhatsappMessageEntity>;
    cleanDemoAccounts(): Promise<{
        success: boolean;
        message: string;
    }>;
    getQR(accountId: string): Promise<{
        success: boolean;
        isConnected: boolean;
        qrCodeDataUrl: string;
    }>;
    startQR(body: {
        accountId: string;
        force?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        alreadyConnected: boolean;
        qrCodeDataUrl: any;
    }>;
    syncAll(body: {
        accountId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    reconnect(body: {
        accountId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    logout(body: {
        accountId: string;
        disconnectedBy?: string;
    }, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    saveChat(body: {
        accountId: string;
        id: string;
        name?: string;
        isGroup?: boolean;
    }): Promise<import("../../session-hydration/entities/whatsapp-chat.entity").WhatsappChatEntity>;
    syncChat(jid: string, body: {
        accountId: string;
        count?: number;
    }): Promise<{
        success: boolean;
        synced: number;
    }>;
    flushAccount(body: {
        accountId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    repairMedia(body: {
        accountId: string;
    }): Promise<{
        success: boolean;
        message: string;
        totalFixed?: undefined;
        totalRedownloaded?: undefined;
        totalFailed?: undefined;
        perAccount?: undefined;
    } | {
        success: boolean;
        message: string;
        totalFixed: number;
        totalRedownloaded: number;
        totalFailed: number;
        perAccount: Record<string, any>;
    }>;
}
