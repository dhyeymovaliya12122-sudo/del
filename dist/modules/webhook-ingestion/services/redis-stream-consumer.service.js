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
var RedisStreamConsumerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStreamConsumerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const os = require("os");
const redis_stream_publisher_service_1 = require("./redis-stream-publisher.service");
const stream_checkpoint_entity_1 = require("../entities/stream-checkpoint.entity");
const webhook_ingestion_log_entity_1 = require("../../security-guard/entities/webhook-ingestion-log.entity");
const CONSUMER_GROUP = 'wa:webhook-consumers';
const DEAD_LETTER_STREAM = 'wa:webhooks:dead-letter';
const BATCH_SIZE = 20;
const BLOCK_MS = 2000;
const PENDING_TIMEOUT_MS = 30000;
const MAX_DELIVERY_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 100;
let RedisStreamConsumerService = RedisStreamConsumerService_1 = class RedisStreamConsumerService {
    constructor(redis, checkpointRepo, webhookLogRepo, publisherService, config) {
        this.redis = redis;
        this.checkpointRepo = checkpointRepo;
        this.webhookLogRepo = webhookLogRepo;
        this.publisherService = publisherService;
        this.config = config;
        this.logger = new common_1.Logger(RedisStreamConsumerService_1.name);
        this.isRunning = false;
        this.streamsSupported = true;
        this.pollLoop = null;
        this.consumerId = `consumer:${os.hostname()}:${process.pid}`;
    }
    async onModuleInit() {
        await this.publisherService.ensureConsumerGroup(CONSUMER_GROUP);
        await this.ensureCheckpoint();
        this.isRunning = true;
        this.logger.log(`[Consumer] Starting ${this.consumerId} on group '${CONSUMER_GROUP}'`);
        this.startPollLoop();
        setInterval(() => this.recoverPendingMessages(), 5 * 60 * 1000);
    }
    onModuleDestroy() {
        this.isRunning = false;
        if (this.pollLoop)
            clearTimeout(this.pollLoop);
        this.logger.log(`[Consumer] ${this.consumerId} shut down`);
    }
    startPollLoop() {
        const BACKOFF_MS = 30_000;
        const poll = async () => {
            if (!this.isRunning || !this.streamsSupported)
                return;
            try {
                await this.readAndProcess();
            }
            catch (err) {
                if (err.message?.includes('Unsupported command')) {
                    this.streamsSupported = false;
                    this.logger.warn('[Consumer] Redis Streams not supported by current Redis instance. ' +
                        'Stream consumer disabled (webhook ingestion via stream unavailable).');
                    return;
                }
                this.logger.error(`[Consumer] Poll error: ${err.message}`);
            }
            this.pollLoop = setTimeout(poll, POLL_INTERVAL_MS);
        };
        poll();
    }
    async readAndProcess() {
        const streamKey = this.publisherService.streamKeyName;
        const result = await this.redis.xreadgroup('GROUP', CONSUMER_GROUP, this.consumerId, 'COUNT', BATCH_SIZE, 'BLOCK', BLOCK_MS, 'STREAMS', streamKey, '>');
        if (!result || result.length === 0)
            return;
        const [[, messages]] = result;
        for (const [messageId, fields] of messages) {
            await this.processMessage(messageId, fields, streamKey);
        }
    }
    async processMessage(messageId, fields, streamKey) {
        const data = {};
        for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
        }
        const { tenantId, accountId, eventType, rawPayload, receivedAt, hmacSignature } = data;
        try {
            let payload;
            try {
                payload = JSON.parse(rawPayload);
            }
            catch {
                throw new Error(`Invalid JSON in stream message ${messageId}`);
            }
            await this.webhookLogRepo.save(this.webhookLogRepo.create({
                eventType,
                payload,
                hmacValid: !!hmacSignature,
            }));
            await this.redis.xack(streamKey, CONSUMER_GROUP, messageId);
            await this.checkpointRepo.update({ streamKey }, { lastAckId: messageId, totalProcessed: () => 'total_processed + 1' });
            this.logger.debug(`[Consumer] ✅ ACKed ${messageId} (tenant:${tenantId}, type:${eventType})`);
        }
        catch (err) {
            this.logger.error(`[Consumer] ❌ Failed to process ${messageId}: ${err.message}`);
        }
    }
    async recoverPendingMessages() {
        try {
            const streamKey = this.publisherService.streamKeyName;
            this.logger.debug('[Consumer] Scanning XPENDING for stuck messages…');
            const pending = await this.redis.xpending(streamKey, CONSUMER_GROUP, '-', '+', 100).catch(() => null);
            if (!pending || pending.length === 0)
                return;
            const stuckIds = pending
                .filter(([, , idleTime, deliveryCount]) => idleTime > PENDING_TIMEOUT_MS || deliveryCount >= MAX_DELIVERY_ATTEMPTS)
                .map(([id]) => id);
            if (stuckIds.length === 0)
                return;
            this.logger.warn(`[Consumer] Found ${stuckIds.length} stuck messages. Reclaiming…`);
            const reclaimed = await this.redis.xclaim(streamKey, CONSUMER_GROUP, this.consumerId, PENDING_TIMEOUT_MS, ...stuckIds);
            const overLimit = pending
                .filter(([, , , deliveryCount]) => deliveryCount >= MAX_DELIVERY_ATTEMPTS)
                .map(([id]) => id);
            for (const msgId of overLimit) {
                await this.deadLetter(msgId, streamKey);
            }
            for (const [messageId, fields] of reclaimed) {
                if (!overLimit.includes(messageId)) {
                    await this.processMessage(messageId, fields, streamKey);
                }
            }
        }
        catch (err) {
            this.logger.debug(`[Consumer] XPENDING recovery skipped: ${err.message}`);
        }
    }
    async deadLetter(messageId, streamKey) {
        const msgs = await this.redis.xrange(streamKey, messageId, messageId);
        if (msgs.length > 0) {
            const [, fields] = msgs[0];
            await this.redis.xadd(DEAD_LETTER_STREAM, 'MAXLEN', '~', '10000', '*', ...fields, 'originalId', messageId, 'deadLetteredAt', Date.now().toString());
        }
        await this.redis.xack(streamKey, CONSUMER_GROUP, messageId);
        await this.checkpointRepo.update({ streamKey }, { totalDeadLettered: () => 'total_dead_lettered + 1' });
        this.logger.error(`[Consumer] 💀 Dead-lettered message: ${messageId}`);
    }
    async ensureCheckpoint() {
        const streamKey = this.publisherService.streamKeyName;
        const exists = await this.checkpointRepo.findOne({ where: { streamKey } });
        if (!exists) {
            await this.checkpointRepo.save(this.checkpointRepo.create({
                streamKey,
                consumerGroup: CONSUMER_GROUP,
                lastAckId: '0',
            }));
        }
    }
    async getLag() {
        const streamKey = this.publisherService.streamKeyName;
        const streamLen = await this.redis.xlen(streamKey);
        const pending = await this.redis.xpending(streamKey, CONSUMER_GROUP, '-', '+', 1).catch(() => []);
        return streamLen;
    }
};
exports.RedisStreamConsumerService = RedisStreamConsumerService;
exports.RedisStreamConsumerService = RedisStreamConsumerService = RedisStreamConsumerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __param(1, (0, typeorm_1.InjectRepository)(stream_checkpoint_entity_1.StreamCheckpointEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(webhook_ingestion_log_entity_1.WebhookIngestionLogEntity)),
    __metadata("design:paramtypes", [ioredis_1.Redis,
        typeorm_2.Repository,
        typeorm_2.Repository,
        redis_stream_publisher_service_1.RedisStreamPublisherService,
        config_1.ConfigService])
], RedisStreamConsumerService);
//# sourceMappingURL=redis-stream-consumer.service.js.map