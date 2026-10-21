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
var OutboundMessageQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundMessageQueueService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const ioredis_1 = require("ioredis");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const uuid_1 = require("uuid");
const message_queue_log_entity_1 = require("../entities/message-queue-log.entity");
const queue_rate_limiter_service_1 = require("./queue-rate-limiter.service");
const proxy_circuit_breaker_service_1 = require("../../proxy-circuit-breaker/services/proxy-circuit-breaker.service");
const PRIORITY_MAP = {
    urgent: 1,
    normal: 5,
    bulk: 10,
};
let OutboundMessageQueueService = OutboundMessageQueueService_1 = class OutboundMessageQueueService {
    constructor(defaultQueue, redis, queueLogRepo, rateLimiterService, circuitBreakerService, config) {
        this.defaultQueue = defaultQueue;
        this.redis = redis;
        this.queueLogRepo = queueLogRepo;
        this.rateLimiterService = rateLimiterService;
        this.circuitBreakerService = circuitBreakerService;
        this.config = config;
        this.logger = new common_1.Logger(OutboundMessageQueueService_1.name);
        this.accountQueues = new Map();
        this.queuePrefix = config.get('BULLMQ_QUEUE_PREFIX', 'wa');
        this.minDelay = config.get('MESSAGE_DELAY_MIN_MS', 1000);
        this.maxDelay = config.get('MESSAGE_DELAY_MAX_MS', 5000);
        this.concurrency = config.get('BULLMQ_CONCURRENCY', 2);
    }
    async enqueue(message) {
        const { accountId } = message;
        const proxyKey = `wa:proxy:account:${accountId}`;
        const proxyId = await this.redis.get(proxyKey);
        if (proxyId) {
            const cbState = await this.circuitBreakerService.getState(proxyId);
            if (cbState === 'OPEN') {
                this.logger.error(`[Queue] ❌ Circuit OPEN for proxy ${proxyId} — refusing to enqueue for account ${accountId}`);
                throw new common_1.ServiceUnavailableException(`Proxy circuit is OPEN for account ${accountId}. Message queuing suspended to prevent IP ban.`);
            }
        }
        const rateCheck = await this.rateLimiterService.checkRateLimit(accountId);
        let jobDelay = 0;
        if (!rateCheck.allowed) {
            jobDelay = rateCheck.resetInMs + this.humanJitter();
            this.logger.warn(`[Queue] Rate limit hit for ${accountId}. Delaying by ${jobDelay}ms`);
        }
        const jitter = this.humanJitter();
        const totalDelay = jobDelay + jitter;
        const jobId = `msg:${accountId}:${(0, uuid_1.v4)()}`;
        const queue = await this.getOrCreateAccountQueue(accountId);
        const job = await queue.add(message.type, { ...message, enqueuedAt: Date.now() }, {
            jobId,
            priority: PRIORITY_MAP[message.priority],
            delay: totalDelay,
            attempts: this.config.get('BULLMQ_MAX_RETRIES', 5),
            backoff: {
                type: 'exponential',
                delay: this.config.get('BULLMQ_BACKOFF_DELAY_MS', 5000),
            },
        });
        await this.queueLogRepo.save(this.queueLogRepo.create({
            jobId,
            accountId,
            queueName: `${this.queuePrefix}:outbound-${accountId}`,
            jobType: message.type,
            status: 'queued',
            payload: message,
        }));
        this.logger.log(`[Queue] 📤 Enqueued ${message.type} for ${accountId} → ${message.to} (delay: ${totalDelay}ms, priority: ${message.priority})`);
        return { jobId, queued: true, delay: totalDelay };
    }
    async pauseAccountQueue(accountId) {
        const queue = this.accountQueues.get(accountId);
        if (queue) {
            await queue.pause();
            this.logger.warn(`[Queue] ⏸  Account queue PAUSED: ${accountId}`);
        }
    }
    async resumeAccountQueue(accountId) {
        const queue = this.accountQueues.get(accountId);
        if (queue) {
            await queue.resume();
            this.logger.log(`[Queue] ▶️  Account queue RESUMED: ${accountId}`);
        }
    }
    async getQueueStats(accountId) {
        const queue = this.accountQueues.get(accountId);
        if (!queue)
            return { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };
        const [waiting, active, delayed, completed, failed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getDelayedCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
        ]);
        return { waiting, active, delayed, completed, failed };
    }
    async enqueueOutboundMessage(params) {
        return this.enqueue({
            accountId: params.accountId,
            tenantId: 'default',
            to: params.toJid,
            type: 'text',
            priority: params.priority || 'normal',
            payload: { text: params.text },
        });
    }
    async drainQueue(accountId, options = {}) {
        const timeoutMs = options.timeoutMs ?? 30000;
        const pollIntervalMs = options.pollIntervalMs ?? 150;
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const stats = await this.getQueueStats(accountId);
            if (stats.waiting === 0 && stats.active === 0 && stats.delayed === 0) {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
    }
    async getAccountStats(accountId) {
        const queueStats = await this.getQueueStats(accountId);
        const [sentInDb, failedInDb] = await Promise.all([
            this.queueLogRepo.count({
                where: { accountId, status: 'completed' },
            }).catch(() => 0),
            this.queueLogRepo.count({
                where: { accountId, status: 'failed' },
            }).catch(() => 0),
        ]);
        return {
            sentCount: Math.max(queueStats.completed, sentInDb),
            failedCount: Math.max(queueStats.failed, failedInDb),
            pendingCount: queueStats.waiting + queueStats.delayed,
            activeCount: queueStats.active,
        };
    }
    async getOrCreateAccountQueue(accountId) {
        if (this.accountQueues.has(accountId)) {
            return this.accountQueues.get(accountId);
        }
        const queueName = `outbound-${accountId}`;
        const limiter = this.rateLimiterService.getQueueLimiterOptions();
        const queue = new bullmq_2.Queue(queueName, {
            connection: this.redis,
            prefix: this.queuePrefix,
            defaultJobOptions: {
                removeOnComplete: 200,
                removeOnFail: 100,
                attempts: this.config.get('BULLMQ_MAX_RETRIES', 5),
                backoff: { type: 'exponential', delay: 5000 },
            },
        });
        this.accountQueues.set(accountId, queue);
        this.logger.log(`[Queue] Created per-account queue: ${queueName} (rate: ${limiter.max} msg/${limiter.duration}ms)`);
        return queue;
    }
    humanJitter() {
        return Math.floor(Math.random() * (this.maxDelay - this.minDelay) + this.minDelay);
    }
};
exports.OutboundMessageQueueService = OutboundMessageQueueService;
exports.OutboundMessageQueueService = OutboundMessageQueueService = OutboundMessageQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('outbound-messages')),
    __param(1, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __param(2, (0, typeorm_1.InjectRepository)(message_queue_log_entity_1.MessageQueueLogEntity)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        ioredis_1.Redis,
        typeorm_2.Repository,
        queue_rate_limiter_service_1.QueueRateLimiterService,
        proxy_circuit_breaker_service_1.ProxyCircuitBreakerService,
        config_1.ConfigService])
], OutboundMessageQueueService);
//# sourceMappingURL=outbound-message-queue.service.js.map