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
var QueueRateLimiterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueRateLimiterService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
let QueueRateLimiterService = QueueRateLimiterService_1 = class QueueRateLimiterService {
    constructor(redis, config) {
        this.redis = redis;
        this.config = config;
        this.logger = new common_1.Logger(QueueRateLimiterService_1.name);
        this.windowMs = 1000;
        this.maxPerSecond = config.get('BULLMQ_MAX_MSG_PER_SECOND', 3);
    }
    async checkRateLimit(accountId) {
        const key = `wa:rate:${accountId}`;
        const now = Date.now();
        const windowKey = `${key}:${Math.floor(now / this.windowMs)}`;
        const pipeline = this.redis.pipeline();
        pipeline.incr(windowKey);
        pipeline.pexpire(windowKey, this.windowMs * 2);
        const results = await pipeline.exec();
        const currentCount = results?.[0]?.[1] ?? 0;
        const allowed = currentCount <= this.maxPerSecond;
        const remaining = Math.max(0, this.maxPerSecond - currentCount);
        const resetInMs = this.windowMs - (now % this.windowMs);
        if (!allowed) {
            this.logger.debug(`[RateLimit] Account ${accountId} exceeded: ${currentCount}/${this.maxPerSecond} (reset in ${resetInMs}ms)`);
        }
        return { allowed, remaining, resetInMs };
    }
    getQueueLimiterOptions() {
        return {
            max: this.maxPerSecond,
            duration: this.windowMs,
        };
    }
    async getCurrentRate(accountId) {
        const key = `wa:rate:${accountId}`;
        const windowKey = `${key}:${Math.floor(Date.now() / this.windowMs)}`;
        const count = await this.redis.get(windowKey);
        return parseInt(count ?? '0', 10);
    }
    async getActiveRateLimits() {
        const keys = await this.redis.keys('wa:rate:*');
        const result = {};
        if (keys.length === 0)
            return result;
        const values = await this.redis.mget(...keys);
        keys.forEach((key, i) => {
            const accountId = key.replace(/^wa:rate:/, '').replace(/:\d+$/, '');
            result[accountId] = parseInt(values[i] ?? '0', 10);
        });
        return result;
    }
};
exports.QueueRateLimiterService = QueueRateLimiterService;
exports.QueueRateLimiterService = QueueRateLimiterService = QueueRateLimiterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [ioredis_1.Redis,
        config_1.ConfigService])
], QueueRateLimiterService);
//# sourceMappingURL=queue-rate-limiter.service.js.map