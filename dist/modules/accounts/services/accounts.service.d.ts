import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';
import { WhatsappChatEntity } from '../../session-hydration/entities/whatsapp-chat.entity';
import { WhatsappContactEntity } from '../../session-hydration/entities/whatsapp-contact.entity';
import { WhatsappMessageEntity } from '../../session-hydration/entities/whatsapp-message.entity';
import { SessionAuthEntity } from '../../session-hydration/entities/session-auth.entity';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';
import { ProxyCircuitBreakerService } from '../../proxy-circuit-breaker/services/proxy-circuit-breaker.service';
import { BaileysClientFactory } from '../../session-hydration/factories/baileys-client.factory';
import { SessionHydrationService } from '../../session-hydration/services/session-hydration.service';
import { UserAccountAccessEntity } from '../../auth/entities/user-account-access.entity';
import { JwtService } from '@nestjs/jwt';
import { DisconnectionMonitorService } from '../../auth/services/disconnection-monitor.service';
export interface AccountDTO {
    id: string;
    phoneNumber: string;
    displayName?: string;
    status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'BANNED';
    tenantId?: string;
    proxyId?: string;
    proxyHealthy?: boolean;
    circuitBreakerState?: 'CLOSED' | 'OPEN' | 'HALF_OPEN' | null;
    unreadCount?: number;
    lastActivity?: number;
    lastMessageText?: string;
    lastSeenAt?: number;
    updatedAt?: number;
    chatCount?: number;
    lastMessageAt?: string;
    createdAt?: string;
    disconnectedAt?: string;
    disconnectedBy?: string;
    disconnectionReason?: string;
    todaysIncoming?: number;
    todaysOutgoing?: number;
    totalIncoming?: number;
    totalOutgoing?: number;
    filteredIncoming?: number;
    filteredOutgoing?: number;
}
export interface CreateAccountDTO {
    accountId?: string;
    phoneNumber?: string;
    displayName?: string;
    tenantId?: string;
    proxyId?: string;
}
export declare class AccountsService implements OnModuleInit {
    private readonly accountRepo;
    private readonly chatRepo;
    private readonly contactRepo;
    private readonly messageRepo;
    private readonly sessionAuthRepo;
    private readonly proxyRepo;
    private readonly accessRepo;
    private readonly redis;
    private readonly cbService;
    private readonly baileysClientFactory;
    private readonly sessionHydrationService;
    private readonly jwtService;
    private readonly disconnectionMonitor?;
    private readonly logger;
    constructor(accountRepo: Repository<WhatsappAccountEntity>, chatRepo: Repository<WhatsappChatEntity>, contactRepo: Repository<WhatsappContactEntity>, messageRepo: Repository<WhatsappMessageEntity>, sessionAuthRepo: Repository<SessionAuthEntity>, proxyRepo: Repository<ProxyPoolEntity>, accessRepo: Repository<UserAccountAccessEntity>, redis: Redis, cbService: ProxyCircuitBreakerService, baileysClientFactory: BaileysClientFactory, sessionHydrationService: SessionHydrationService, jwtService: JwtService, disconnectionMonitor?: DisconnectionMonitorService);
    onModuleInit(): Promise<void>;
    findAll(tenantId?: string, userOrAuth?: any, startDate?: string, endDate?: string): Promise<AccountDTO[]>;
    findOne(id: string, tenantId?: string, userOrAuth?: any, startDate?: string, endDate?: string): Promise<AccountDTO>;
    create(dto: CreateAccountDTO): Promise<AccountDTO>;
    update(id: string, updateData: {
        displayName?: string;
    }): Promise<AccountDTO>;
    updateStatus(id: string, status: string): Promise<void>;
    delete(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private getAccountMessageMetrics;
    private enrichAccount;
    getLinkedDevices(accountId: string): Promise<any>;
    pairDevice(accountId: string, payload?: any): Promise<{
        pairingId: string;
        deviceId: any;
        qrPayload: string;
        expiresAt: number;
    }>;
    approveDevice(accountId: string, body: {
        pairingId: string;
    }): Promise<{
        success: boolean;
        device: {
            id: string;
            accountId: string;
            deviceId: string;
            deviceName: string;
            deviceType: "desktop" | "web";
            platform: string;
            status: "active";
            isPrimary: boolean;
            publicKey: string;
            ipAddress: string;
            location: string;
            lastSeenAt: number;
            createdAt: number;
        };
    }>;
    revokeDevice(accountId: string, deviceId: string): Promise<{
        success: boolean;
        revokedId: string;
    }>;
}
