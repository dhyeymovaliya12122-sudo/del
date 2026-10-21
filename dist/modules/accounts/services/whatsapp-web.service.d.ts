import { OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { WhatsappChatEntity } from '../../session-hydration/entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../../session-hydration/entities/whatsapp-contact.entity';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
import { SessionHydrationService } from '../../session-hydration/services/session-hydration.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class WhatsappWebService implements OnModuleInit {
    private readonly chatRepo;
    private readonly contactRepo;
    private readonly messageRepo;
    private readonly accountRepo;
    private readonly baileysClientFactory;
    private readonly sessionHydrationService;
    private readonly redis?;
    private readonly eventEmitter?;
    private readonly logger;
    constructor(chatRepo: Repository<WhatsappChatEntity>, contactRepo: Repository<WhatsappContactEntity>, messageRepo: Repository<WhatsappMessageEntity>, accountRepo: Repository<WhatsappAccountEntity>, baileysClientFactory: BaileysClientFactory, sessionHydrationService: SessionHydrationService, redis?: Redis, eventEmitter?: EventEmitter2);
    onModuleInit(): Promise<void>;
    private syncedLidAccounts;
    private chatUpdateQueue;
    private isDrainingQueue;
    private enqueueChatUpdate;
    private scheduleQueueDrain;
    private drainChatUpdateQueue;
    private chatsCache;
    invalidateChatsCache(accountId?: string): Promise<void>;
    private syncLidsInBackground;
    getChats(accountId: string, search?: string, limit?: number, offset?: number, startDate?: string, endDate?: string): Promise<any>;
    getMessages(accountId: string, chatJid: string, limit?: number, startDate?: string, endDate?: string, search?: string, ghostMode?: boolean): Promise<WhatsappMessageEntity[]>;
    clearChatMessages(accountId: string, chatJid: string): Promise<{
        success: boolean;
        deletedCount: number;
    }>;
    getContacts(accountId: string, search?: string): Promise<WhatsappContactEntity[]>;
    sendMessage(accountId: string, to: string, text: string, quotedMsgId?: string): Promise<any>;
    sendVoiceNote(accountId: string, to: string, audioBuffer: Buffer, quotedMsgId?: string): Promise<any>;
    sendReaction(accountId: string, to: string, messageId: string, emoji: string, fromMe?: boolean): Promise<{
        success: boolean;
        messageId: string;
        reaction: string;
    }>;
    cleanDemoAccounts(): Promise<{
        success: boolean;
        message: string;
    }>;
    streamMedia(accountId: string, filename: string, res: any, customName?: string, download?: boolean): Promise<void>;
    sendMedia(accountId: string, to: string, fileBuffer: Buffer, fileName: string, mimeType: string, caption?: string): Promise<{
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
    } & WhatsappMessageEntity>;
    startQR(accountId: string, force?: boolean): Promise<{
        success: boolean;
        message: string;
        alreadyConnected: boolean;
        qrCodeDataUrl: any;
    }>;
    getQR(accountId: string): Promise<{
        success: boolean;
        isConnected: boolean;
        qrCodeDataUrl: string;
    }>;
    saveChat(accountId: string, chatData: {
        id: string;
        name?: string;
        isGroup?: boolean;
    }): Promise<WhatsappChatEntity>;
    syncChatMessages(accountId: string, chatJid: string, count?: number): Promise<{
        success: boolean;
        synced: number;
    }>;
    flushAccount(accountId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    syncAll(accountId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    reconnect(accountId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    logout(accountId: string, disconnectedBy?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    repairMedia(accountId: string): Promise<{
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
