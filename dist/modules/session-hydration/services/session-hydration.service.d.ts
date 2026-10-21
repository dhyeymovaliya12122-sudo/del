import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SessionSyncManager } from './session-sync.manager';
import { BaileysClientFactory } from '../factories/baileys-client.factory';
import { WhatsappAccountEntity } from '../entities/whatsapp-account.entity';
export declare class SessionHydrationService implements OnApplicationBootstrap {
    private readonly accountRepo;
    private readonly sessionSyncManager;
    private readonly baileysClientFactory;
    private readonly config;
    private readonly logger;
    constructor(accountRepo: Repository<WhatsappAccountEntity>, sessionSyncManager: SessionSyncManager, baileysClientFactory: BaileysClientFactory, config: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    hydrateAccount(accountId: string): Promise<void>;
    terminateAccount(accountId: string, logout?: boolean): Promise<void>;
}
