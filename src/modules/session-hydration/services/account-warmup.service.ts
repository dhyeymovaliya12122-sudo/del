// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/services/account-warmup.service.ts
//  Pillar 1: Algorithmic Account Warm-Up Progression Engine
// ─────────────────────────────────────────────────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  healthScore: number; // 0 - 100
  advisory: string;
}

@Injectable()
export class AccountWarmupService {
  private readonly logger = new Logger(AccountWarmupService.name);

  // In-memory daily counter tracking: Map<accountId, { dateKey: 'YYYY-MM-DD', count: number }>
  private readonly dailyDispatchCounters = new Map<string, { dateKey: string; count: number }>();

  constructor(
    @InjectRepository(WhatsappAccountEntity)
    private readonly accountRepo: Repository<WhatsappAccountEntity>,
  ) {}

  /**
   * Calculates the logarithmic daily message threshold based on account age.
   * Day 1:  15 msgs max  | Cold Account
   * Day 3:  45 msgs max  | Establishing Trust
   * Day 7:  150 msgs max | Warm Account
   * Day 14+: 1,000+ msgs | Mature Enterprise Tier
   */
  computeDailyThreshold(daysConnected: number): number {
    if (daysConnected <= 1) {
      return 15;
    }
    if (daysConnected <= 3) {
      return 45;
    }
    if (daysConnected <= 7) {
      // Linear ramp between 45 and 150
      const progress = (daysConnected - 3) / 4;
      return Math.round(45 + progress * 105);
    }
    if (daysConnected < 14) {
      // Rapid acceleration towards 1,000
      const daysAbove7 = daysConnected - 7;
      return Math.round(150 + (daysAbove7 / 7) * 850);
    }
    return 1500; // Mature Enterprise Tier
  }

  computeWarmupTier(daysConnected: number): WarmupTier {
    if (daysConnected <= 1) return 'COLD';
    if (daysConnected <= 6) return 'ESTABLISHING_TRUST';
    if (daysConnected <= 13) return 'WARM';
    return 'MATURE_ENTERPRISE';
  }

  private getDateKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getSentCountToday(accountId: string): number {
    const today = this.getDateKey();
    const entry = this.dailyDispatchCounters.get(accountId);
    if (!entry || entry.dateKey !== today) {
      return 0;
    }
    return entry.count;
  }

  /**
   * Fetches full warm-up health profile for a given WhatsApp account.
   */
  async getWarmupProfile(accountId: string): Promise<WarmupProfile> {
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    const now = Date.now();
    const createdTime = account?.createdAt ? new Date(account.createdAt).getTime() : now;
    const daysConnected = Math.max(1, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));

    const dailyThreshold = this.computeDailyThreshold(daysConnected);
    const sentToday = this.getSentCountToday(accountId);
    const remainingQuota = Math.max(0, dailyThreshold - sentToday);
    const isThrottled = remainingQuota === 0;
    const tier = this.computeWarmupTier(daysConnected);

    // Compute health score (100 is best, penalized when close to quota ceiling)
    const utilization = sentToday / dailyThreshold;
    const healthScore = Math.max(10, Math.round(100 - utilization * 30));

    let advisory = `Account is warm and within safe carrier dispatch bounds.`;
    if (tier === 'COLD') {
      advisory = `Cold account (Day 1). Strict limit of ${dailyThreshold} msgs/day enforced to prevent instant WhatsApp ban.`;
    } else if (tier === 'ESTABLISHING_TRUST') {
      advisory = `Establishing trust (Day ${daysConnected}). Daily ceiling capped at ${dailyThreshold} msgs/day.`;
    } else if (isThrottled) {
      advisory = `Daily anti-ban safety quota reached (${sentToday}/${dailyThreshold}). Resumes tomorrow.`;
    }

    return {
      accountId,
      phoneNumber: account?.phoneNumber,
      daysConnected,
      tier,
      dailyThreshold,
      sentToday,
      remainingQuota,
      isThrottled,
      healthScore,
      advisory,
    };
  }

  /**
   * Verifies if an outbound message can be dispatched without risking carrier ban.
   */
  async canDispatch(accountId: string): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
    const profile = await this.getWarmupProfile(accountId);
    if (profile.isThrottled) {
      return {
        allowed: false,
        remaining: 0,
        reason: `[Anti-Ban Guard] Account daily warm-up limit reached (${profile.sentToday}/${profile.dailyThreshold} msgs). Cooldown active until midnight to prevent carrier block.`,
      };
    }
    return {
      allowed: true,
      remaining: profile.remainingQuota,
    };
  }

  /**
   * Increments today's outbound counter for this account.
   */
  recordDispatch(accountId: string): void {
    const today = this.getDateKey();
    const current = this.dailyDispatchCounters.get(accountId);
    if (!current || current.dateKey !== today) {
      this.dailyDispatchCounters.set(accountId, { dateKey: today, count: 1 });
    } else {
      current.count += 1;
    }
    this.logger.debug(
      `[Anti-Ban Counter] Account ${accountId}: dispatched message today (${this.getSentCountToday(accountId)})`,
    );
  }
}
