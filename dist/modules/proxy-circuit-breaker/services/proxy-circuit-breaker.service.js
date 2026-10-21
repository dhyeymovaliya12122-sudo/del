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
var ProxyCircuitBreakerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyCircuitBreakerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const proxy_circuit_breaker_entity_1 = require("../entities/proxy-circuit-breaker.entity");
const proxy_pool_entity_1 = require("../../proxy-binding/entities/proxy-pool.entity");
const smart_proxy_rotator_service_1 = require("./smart-proxy-rotator.service");
let ProxyCircuitBreakerService = ProxyCircuitBreakerService_1 = class ProxyCircuitBreakerService {
    constructor(cbRepo, proxyRepo, redis, healthQueue, config, proxyRotator) {
        this.cbRepo = cbRepo;
        this.proxyRepo = proxyRepo;
        this.redis = redis;
        this.healthQueue = healthQueue;
        this.config = config;
        this.proxyRotator = proxyRotator;
        this.logger = new common_1.Logger(ProxyCircuitBreakerService_1.name);
        this.key = (proxyId, suffix) => `${this.prefix}${proxyId}:${suffix}`;
        this.prefix = config.get('PROXY_CIRCUIT_BREAKER_REDIS_KEY_PREFIX', 'cb:proxy:');
        this.threshold = config.get('PROXY_CIRCUIT_BREAKER_THRESHOLD', 3);
        this.resetMs = config.get('PROXY_CIRCUIT_BREAKER_RESET_MS', 60000);
        this.halfOpenMax = config.get('PROXY_CIRCUIT_BREAKER_HALF_OPEN_MAX', 1);
    }
    async getState(proxyId) {
        const state = await this.redis.get(this.key(proxyId, 'state'));
        return state ?? 'CLOSED';
    }
    async recordFailure(proxyId, accountId) {
        const stateKey = this.key(proxyId, 'state');
        const failKey = this.key(proxyId, 'failures');
        const currentState = await this.getState(proxyId);
        if (currentState === 'OPEN') {
            this.logger.debug(`[CB] Proxy ${proxyId} already OPEN — skipping duplicate failure`);
            return;
        }
        const failures = await this.redis.incr(failKey);
        await this.redis.pexpire(failKey, this.resetMs * 2);
        this.logger.warn(`[CB] Proxy ${proxyId} failure ${failures}/${this.threshold} (state: ${currentState})`);
        if (failures >= this.threshold) {
            await this.openCircuit(proxyId, accountId);
        }
    }
    async recordSuccess(proxyId) {
        const currentState = await this.getState(proxyId);
        if (currentState === 'HALF_OPEN') {
            await this.closeCircuit(proxyId);
        }
        else if (currentState === 'CLOSED') {
            await this.redis.del(this.key(proxyId, 'failures'));
        }
    }
    async openCircuit(proxyId, accountId) {
        const stateKey = this.key(proxyId, 'state');
        const openedAtKey = this.key(proxyId, 'opened_at');
        await this.redis.set(stateKey, 'OPEN', 'PX', this.resetMs);
        await this.redis.set(openedAtKey, Date.now().toString(), 'PX', this.resetMs);
        this.logger.error(`[CB] 🔴 Circuit OPENED for proxy ${proxyId}. Queue PAUSED. Reset in ${this.resetMs}ms`);
        if (accountId) {
            await this.pauseAccountQueue(accountId, proxyId);
        }
        await this.proxyRepo.update(proxyId, { isHealthy: false });
        if (accountId && this.proxyRotator) {
            try {
                const rotatedProxy = await this.proxyRotator.rotateToCleanSubnet(accountId, proxyId);
                this.logger.log(`🟢 [Self-Healing Swarm] Account ${accountId} auto-rotated to clean subnet proxy: ${rotatedProxy.host}:${rotatedProxy.port}`);
            }
            catch (rotErr) {
                this.logger.warn(`⚠️ [Self-Healing Swarm] Failed to auto-rotate proxy for ${accountId}: ${rotErr.message}`);
            }
        }
        await this.upsertCbState(proxyId, accountId, 'OPEN');
        await this.healthQueue.add('circuit-reset', { proxyId, accountId }, { delay: this.resetMs });
    }
    async halfOpenCircuit(proxyId, accountId) {
        const stateKey = this.key(proxyId, 'state');
        await this.redis.set(stateKey, 'HALF_OPEN', 'EX', 60);
        this.logger.warn(`[CB] 🟡 Circuit HALF_OPEN for proxy ${proxyId}. Probing…`);
        await this.upsertCbState(proxyId, accountId, 'HALF_OPEN');
    }
    async closeCircuit(proxyId, accountId) {
        const stateKey = this.key(proxyId, 'state');
        const failKey = this.key(proxyId, 'failures');
        await this.redis.del(stateKey, failKey);
        this.logger.log(`[CB] 🟢 Circuit CLOSED for proxy ${proxyId}. Queue RESUMED.`);
        await this.proxyRepo.update(proxyId, { isHealthy: true });
        if (accountId) {
            await this.resumeAccountQueue(accountId);
        }
        await this.upsertCbState(proxyId, accountId, 'CLOSED');
    }
    async pauseAccountQueue(accountId, proxyId) {
        try {
            const queueName = `wa:outbound:${accountId}`;
            const queueKey = `bull:${queueName}`;
            await this.redis.set(`${queueKey}:paused`, '1');
            await this.redis.publish('wa:queue:control', JSON.stringify({ action: 'pause', accountId, queueName, reason: `proxy_cb_open:${proxyId}` }));
            this.logger.warn(`[CB] ⏸  Queue PAUSED: ${queueName} (proxy ${proxyId} OPEN)`);
        }
        catch (err) {
            this.logger.error(`[CB] Failed to pause queue for account ${accountId}: ${err.message}`);
        }
    }
    async resumeAccountQueue(accountId) {
        try {
            const queueName = `wa:outbound:${accountId}`;
            const queueKey = `bull:${queueName}`;
            await this.redis.del(`${queueKey}:paused`);
            await this.redis.publish('wa:queue:control', JSON.stringify({ action: 'resume', accountId, queueName }));
            this.logger.log(`[CB] ▶️  Queue RESUMED: ${queueName}`);
        }
        catch (err) {
            this.logger.error(`[CB] Failed to resume queue for account ${accountId}: ${err.message}`);
        }
    }
    async upsertCbState(proxyId, accountId, state) {
        const existing = await this.cbRepo.findOne({ where: { proxyId } });
        if (existing) {
            await this.cbRepo.update(existing.id, {
                state,
                accountId,
                ...(state === 'OPEN' ? { openedAt: new Date(), lastFailureAt: new Date() } : {}),
                ...(state === 'CLOSED' ? { resetAt: new Date(), failureCount: 0 } : {}),
            });
        }
        else {
            await this.cbRepo.save(this.cbRepo.create({
                proxyId,
                accountId,
                state,
                failureCount: state === 'OPEN' ? this.threshold : 0,
                openedAt: state === 'OPEN' ? new Date() : undefined,
            }));
        }
    }
    async getAllCircuitStates() {
        const records = await this.cbRepo.find();
        return Promise.all(records.map(async (r) => ({
            proxyId: r.proxyId,
            state: await this.getState(r.proxyId),
            failures: parseInt((await this.redis.get(this.key(r.proxyId, 'failures'))) ?? '0', 10),
        })));
    }
};
exports.ProxyCircuitBreakerService = ProxyCircuitBreakerService;
exports.ProxyCircuitBreakerService = ProxyCircuitBreakerService = ProxyCircuitBreakerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(proxy_circuit_breaker_entity_1.ProxyCircuitBreakerEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(proxy_pool_entity_1.ProxyPoolEntity)),
    __param(2, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __param(3, (0, bullmq_1.InjectQueue)('proxy-health-check')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        ioredis_1.Redis,
        bullmq_2.Queue,
        config_1.ConfigService,
        smart_proxy_rotator_service_1.SmartProxyRotatorService])
], ProxyCircuitBreakerService);
//# sourceMappingURL=proxy-circuit-breaker.service.js.map