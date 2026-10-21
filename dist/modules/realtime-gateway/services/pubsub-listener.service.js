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
var PubSubListenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PubSubListenerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
let PubSubListenerService = PubSubListenerService_1 = class PubSubListenerService {
    constructor(redis, config) {
        this.redis = redis;
        this.config = config;
        this.logger = new common_1.Logger(PubSubListenerService_1.name);
    }
    async onModuleInit() {
        this.subscriber = this.redis.duplicate();
        await this.subscriber.subscribe('wa:queue:control', 'wa:session:events');
        this.subscriber.on('message', (channel, message) => {
            this.handleMessage(channel, message);
        });
        this.logger.log('📡 Redis Pub/Sub listener active on: wa:queue:control, wa:session:events');
    }
    onModuleDestroy() {
        this.subscriber?.disconnect();
    }
    handleMessage(channel, message) {
        try {
            const payload = JSON.parse(message);
            if (channel === 'wa:queue:control') {
                const { action, accountId, queueName, reason } = payload;
                this.logger.log(`[PubSub] Queue control: ${action} → ${queueName} (reason: ${reason ?? 'manual'})`);
            }
            if (channel === 'wa:session:events') {
                this.logger.debug(`[PubSub] Session event: ${JSON.stringify(payload)}`);
            }
        }
        catch (err) {
            this.logger.error(`[PubSub] Failed to parse message on ${channel}: ${err.message}`);
        }
    }
    async publish(channel, payload) {
        await this.redis.publish(channel, JSON.stringify(payload));
    }
};
exports.PubSubListenerService = PubSubListenerService;
exports.PubSubListenerService = PubSubListenerService = PubSubListenerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [ioredis_1.Redis,
        config_1.ConfigService])
], PubSubListenerService);
//# sourceMappingURL=pubsub-listener.service.js.map