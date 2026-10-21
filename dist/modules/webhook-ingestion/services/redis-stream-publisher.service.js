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
var RedisStreamPublisherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStreamPublisherService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const os = require("os");
let RedisStreamPublisherService = RedisStreamPublisherService_1 = class RedisStreamPublisherService {
    constructor(redis, config) {
        this.redis = redis;
        this.config = config;
        this.logger = new common_1.Logger(RedisStreamPublisherService_1.name);
        this.streamKey = config.get('REDIS_STREAM_KEY', 'wa:webhooks:incoming');
        this.maxStreamLen = config.get('REDIS_STREAM_MAX_LEN', 100000);
        this.instanceId = os.hostname();
    }
    async publish(entry) {
        const fields = [
            'tenantId', entry.tenantId,
            'accountId', entry.accountId,
            'eventType', entry.eventType,
            'rawPayload', JSON.stringify(entry.rawPayload),
            'receivedAt', Date.now().toString(),
            'instanceId', this.instanceId,
        ];
        if (entry.hmacSignature) {
            fields.push('hmacSignature', entry.hmacSignature);
        }
        let streamId;
        let streamLen = 0;
        try {
            streamId = await this.redis.xadd(this.streamKey, 'MAXLEN', '~', this.maxStreamLen.toString(), '*', ...fields);
            streamLen = await this.redis.xlen(this.streamKey);
        }
        catch (err) {
            if (err.message?.includes('Unsupported command') || err.message?.includes('xadd')) {
                streamId = `mock_stream_${Date.now()}`;
                this.logger.debug(`[Stream] Mock Redis in use. Emulated stream buffer id: ${streamId}`);
                return { streamId, streamLen: 1 };
            }
            throw err;
        }
        this.logger.debug(`[Stream] XADD ${this.streamKey} → id:${streamId} (len:${streamLen}, tenant:${entry.tenantId})`);
        if (streamLen > this.maxStreamLen * 0.9) {
            this.logger.warn(`[Stream] ⚠️  Stream ${this.streamKey} at ${Math.round(streamLen / this.maxStreamLen * 100)}% capacity`);
        }
        return { streamId, streamLen };
    }
    async ensureConsumerGroup(groupName) {
        try {
            await this.redis.xgroup('CREATE', this.streamKey, groupName, '$', 'MKSTREAM');
            this.logger.log(`[Stream] Consumer group '${groupName}' created on stream '${this.streamKey}'`);
        }
        catch (err) {
            if (!err.message?.includes('BUSYGROUP')) {
                this.logger.warn(`[Stream] Consumer group init skipped: ${err.message}`);
            }
            this.logger.debug(`[Stream] Consumer group '${groupName}' already exists`);
        }
    }
    async getStreamInfo() {
        const length = await this.redis.xlen(this.streamKey);
        const groups = await this.redis.xinfo('GROUPS', this.streamKey).catch(() => []);
        return { length, groups: groups.length };
    }
    get streamKeyName() {
        return this.streamKey;
    }
};
exports.RedisStreamPublisherService = RedisStreamPublisherService;
exports.RedisStreamPublisherService = RedisStreamPublisherService = RedisStreamPublisherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [ioredis_1.Redis,
        config_1.ConfigService])
], RedisStreamPublisherService);
//# sourceMappingURL=redis-stream-publisher.service.js.map