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
var AnalyticsEmitterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEmitterService = void 0;
const common_1 = require("@nestjs/common");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
let AnalyticsEmitterService = AnalyticsEmitterService_1 = class AnalyticsEmitterService {
    constructor(redis) {
        this.redis = redis;
        this.logger = new common_1.Logger(AnalyticsEmitterService_1.name);
        this.STREAM_MAX_LEN = 100_000;
    }
    async emit(event) {
        try {
            await this.redis.xadd(`wa:analytics:${event.accountId}`, 'MAXLEN', '~', String(this.STREAM_MAX_LEN), '*', 'event', JSON.stringify({ ...event, timestamp: event.timestamp ?? Date.now() }));
        }
        catch (err) {
            this.logger.warn(`[Analytics] emit failed: ${err.message}`);
        }
    }
    async getRecent(accountId, count = 1000) {
        const entries = await this.redis.xrevrange(`wa:analytics:${accountId}`, '+', '-', 'COUNT', count);
        return entries
            .map(([, fields]) => {
            try {
                return JSON.parse(fields[1]);
            }
            catch {
                return null;
            }
        })
            .filter((e) => e !== null);
    }
};
exports.AnalyticsEmitterService = AnalyticsEmitterService;
exports.AnalyticsEmitterService = AnalyticsEmitterService = AnalyticsEmitterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [Function])
], AnalyticsEmitterService);
//# sourceMappingURL=analytics-emitter.service.js.map