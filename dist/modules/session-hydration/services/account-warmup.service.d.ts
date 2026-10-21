import { Repository } from 'typeorm';
import { WhatsappAccountEntity } from '../entities/whatsapp-account.entity';
export type WarmupTier = 'COLD' | 'ESTABLISHING_TRUST' | 'WARM' | 'MATURE_ENTERPRISE';
export interface WarmupProfile {
    accountId: string;
    phoneNumber?: string;
    daysConnected: number;
    tier: WarmupTier;
    dailyThreshold: number;
    sentToday: number;
    remainingQuota: number;
    isThrottled: boolean;
    healthScore: number;
    advisory: string;
}
export declare class AccountWarmupService {
    private readonly accountRepo;
    private readonly logger;
    private readonly dailyDispatchCounters;
    constructor(accountRepo: Repository<WhatsappAccountEntity>);
    computeDailyThreshold(daysConnected: number): number;
    computeWarmupTier(daysConnected: number): WarmupTier;
    private getDateKey;
    private getSentCountToday;
    getWarmupProfile(accountId: string): Promise<WarmupProfile>;
    canDispatch(accountId: string): Promise<{
        allowed: boolean;
        remaining: number;
        reason?: string;
    }>;
    recordDispatch(accountId: string): void;
}
