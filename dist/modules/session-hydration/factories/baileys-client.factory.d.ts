import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WASocket } from 'baileys';
import { ProxyBindingService } from '../../proxy-binding/services/proxy-binding.service';
import { SessionSyncManager } from '../services/session-sync.manager';
import { BaileysMediaPipelineService } from '../services/baileys-media-pipeline.service';
import { BaileysSyncService } from '../services/baileys-sync.service';
import { BehavioralTypingService } from '../services/behavioral-typing.service';
import { AccountWarmupService } from '../services/account-warmup.service';
import { DistributedSocketManagerService } from '../services/distributed-socket-manager.service';
import { RealtimeEventService } from '../../realtime-gateway/services/realtime-event.service';
import { TelemetryService } from '../../telemetry/services/telemetry.service';
import { WhatsappAccountEntity } from '../entities/whatsapp-account.entity';
import { WhatsappChatEntity } from '../entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../entities/whatsapp-contact.entity';
import { WhatsappMessageEntity } from '../entities/whatsapp-message.entity';
import { UserAccountAccessEntity } from '../../auth/entities/user-account-access.entity';
import { AppUserEntity } from '../../auth/entities/app-user.entity';
export interface BaileysClientInstance {
    accountId: string;
    socket: WASocket;
    authDir: string;
    createdAt: Date;
}
export declare function unwrapMessage(msg?: any): any;
export declare function extractProtocolMessage(msg: any): any;
export declare function extractDirectEditedContent(msg: any): {
    targetId?: string;
    targetChat?: string;
    content?: any;
} | null;
export declare class BaileysClientFactory {
    private readonly accountRepo;
    private readonly chatRepo;
    private readonly contactRepo;
    private readonly messageRepo;
    private readonly accessRepo;
    private readonly userRepo;
    private readonly proxyBindingService;
    private readonly sessionSyncManager;
    private readonly mediaPipelineService;
    private readonly syncService;
    private readonly config;
    private readonly realtimeService;
    private readonly eventEmitter;
    private readonly behavioralTypingService;
    private readonly accountWarmupService;
    private readonly socketManager;
    private readonly telemetryService?;
    private readonly logger;
    private readonly clients;
    private readonly clientCreationLocks;
    private readonly qrLocks;
    private readonly activeQRCodes;
    private readonly qrResolvers;
    private readonly reconnectTimers;
    private readonly qrRetryCounts;
    constructor(accountRepo: Repository<WhatsappAccountEntity>, chatRepo: Repository<WhatsappChatEntity>, contactRepo: Repository<WhatsappContactEntity>, messageRepo: Repository<WhatsappMessageEntity>, accessRepo: Repository<UserAccountAccessEntity>, userRepo: Repository<AppUserEntity>, proxyBindingService: ProxyBindingService, sessionSyncManager: SessionSyncManager, mediaPipelineService: BaileysMediaPipelineService, syncService: BaileysSyncService, config: ConfigService, realtimeService: RealtimeEventService, eventEmitter: EventEmitter2, behavioralTypingService: BehavioralTypingService, accountWarmupService: AccountWarmupService, socketManager: DistributedSocketManagerService, telemetryService?: TelemetryService);
    private sanitizeIncomingContact;
    private unpackArchiveIfNeeded;
    createClient(accountId: string, authDir: string): Promise<BaileysClientInstance>;
    syncGroupsAndContacts(accountId: string, socketInstance?: WASocket): Promise<void>;
    syncAllData(accountId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private handleEditedMessage;
    private processMessage;
    sendMessage(accountId: string, to: string, text: string, quotedMsgId?: string): Promise<any>;
    sendVoiceNote(accountId: string, to: string, audioBuffer: Buffer, quotedMsgId?: string): Promise<any>;
    sendReaction(accountId: string, to: string, messageId: string, emoji: string, fromMe?: boolean): Promise<{
        success: boolean;
        messageId: string;
        reaction: string;
    }>;
    sendMediaMessage(accountId: string, to: string, fileBuffer: Buffer, fileName: string, mimeType: string, caption?: string): Promise<{
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
    isSocketConnected(accountId: string): boolean;
    isSocketPending(accountId: string): boolean;
    resolveDeliverableJid(accountId: string, to: string): Promise<string>;
    startQR(accountId: string, force?: boolean): Promise<{
        success: boolean;
        alreadyConnected?: boolean;
    }>;
    getActiveQRCode(accountId: string): string | null;
    broadcast(tenantId: string, accountId: string, event: string, payload: any): void;
    private emitClientMessageNotification;
    getClient(accountId: string): BaileysClientInstance | undefined;
    destroyClient(accountId: string): Promise<void>;
    saveChat(accountId: string, chatData: {
        id: string;
        name?: string;
        isGroup?: boolean;
    }): Promise<WhatsappChatEntity>;
    syncChatMessages(accountId: string, chatJid: string, count?: number): Promise<{
        success: boolean;
        synced: number;
    }>;
    preLogoutFlush(accountId: string): Promise<void>;
    logoutClient(accountId: string): Promise<void>;
    getActiveClients(): string[];
    repairMediaUrls(accountId: string): Promise<{
        fixed: number;
        redownloaded: number;
        failed: number;
    }>;
    simulateAbruptSocketDrop(accountId: string, statusCode?: number, reason?: string): boolean;
    registerMockClient(accountId: string, mockInstance: Partial<BaileysClientInstance>): void;
}
