"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AccountWarmupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountWarmupService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const whatsapp_account_entity_1 = require("../entities/whatsapp-account.entity");
let AccountWarmupService = AccountWarmupService_1 = class AccountWarmupService {
    constructor(accountRepo) {
        this.accountRepo = accountRepo;
        this.logger = new common_1.Logger(AccountWarmupService_1.name);
        this.dailyDispatchCounters = new Map();
    }
    computeDailyThreshold(daysConnected) {
        if (daysConnected <= 1) {
            return 15;
        }
        if (daysConnected <= 3) {
            return 45;
        }
        if (daysConnected <= 7) {
            const progress = (daysConnected - 3) / 4;
            return Math.round(45 + progress * 105);
        }
        if (daysConnected < 14) {
            const daysAbove7 = daysConnected - 7;
            return Math.round(150 + (daysAbove7 / 7) * 850);
        }
        return 1500;
    }
    computeWarmupTier(daysConnected) {
        if (daysConnected <= 1)
            return 'COLD';
        if (daysConnected <= 6)
            return 'ESTABLISHING_TRUST';
        if (daysConnected <= 13)
            return 'WARM';
        return 'MATURE_ENTERPRISE';
    }
    getDateKey() {
        return new Date().toISOString().split('T')[0];
    }
    getSentCountToday(accountId) {
        const today = this.getDateKey();
        const entry = this.dailyDispatchCounters.get(accountId);
        if (!entry || entry.dateKey !== today) {
            return 0;
        }
        return entry.count;
    }
    async getWarmupProfile(accountId) {
        const account = await this.accountRepo.findOne({ where: { id: accountId } });
        const now = Date.now();
        const createdTime = account?.createdAt ? new Date(account.createdAt).getTime() : now;
        const daysConnected = Math.max(1, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
        const dailyThreshold = this.computeDailyThreshold(daysConnected);
        const sentToday = this.getSentCountToday(accountId);
        const remainingQuota = Math.max(0, dailyThreshold - sentToday);
        const isThrottled = remainingQuota === 0;
        const tier = this.computeWarmupTier(daysConnected);
        const utilization = sentToday / dailyThreshold;
        const healthScore = Math.max(10, Math.round(100 - utilization * 30));
        let advisory = `Account is warm and within safe carrier dispatch bounds.`;
        if (tier === 'COLD') {
            advisory = `Cold account (Day 1). Strict limit of ${dailyThreshold} msgs/day enforced to prevent instant WhatsApp ban.`;
        }
        else if (tier === 'ESTABLISHING_TRUST') {
            advisory = `Establishing trust (Day ${daysConnected}). Daily ceiling capped at ${dailyThreshold} msgs/day.`;
        }
        else if (isThrottled) {
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
    async canDispatch(accountId) {
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
    recordDispatch(accountId) {
        const today = this.getDateKey();
        const current = this.dailyDispatchCounters.get(accountId);
        if (!current || current.dateKey !== today) {
            this.dailyDispatchCounters.set(accountId, { dateKey: today, count: 1 });
        }
        else {
            current.count += 1;
        }
        this.logger.debug(`[Anti-Ban Counter] Account ${accountId}: dispatched message today (${this.getSentCountToday(accountId)})`);
    }
};
exports.AccountWarmupService = AccountWarmupService;
exports.AccountWarmupService = AccountWarmupService = AccountWarmupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(whatsapp_account_entity_1.WhatsappAccountEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AccountWarmupService);
//# sourceMappingURL=account-warmup.service.js.map