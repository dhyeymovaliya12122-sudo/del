import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { SessionAuthEntity } from '../entities/session-auth.entity';
import { SessionCryptoService } from './session-crypto.service';
export interface HydrationResult {
    accountId: string;
    authDir: string;
    hydratedAt: Date;
    fromCache: boolean;
}
export declare class SessionSyncManager {
    private readonly sessionRepo;
    private readonly redis;
    private readonly cryptoService;
    private readonly config;
    private readonly logger;
    constructor(sessionRepo: Repository<SessionAuthEntity>, redis: Redis, cryptoService: SessionCryptoService, config: ConfigService);
    hydrateSession(accountId: string): Promise<HydrationResult>;
    persistSession(accountId: string, authData?: object): Promise<void>;
    cleanupEphemeralSession(accountId: string): Promise<void>;
    hasSession(accountId: string): Promise<boolean>;
    invalidateSession(accountId: string): Promise<void>;
    createEmptySession(accountId: string): Promise<HydrationResult>;
    getAuthDir(accountId: string): string;
    private writeAuthFiles;
}
