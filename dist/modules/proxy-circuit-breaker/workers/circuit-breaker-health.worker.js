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
var CircuitBreakerHealthWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerHealthWorker = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const proxy_pool_entity_1 = require("../../proxy-binding/entities/proxy-pool.entity");
let CircuitBreakerHealthWorker = CircuitBreakerHealthWorker_1 = class CircuitBreakerHealthWorker {
    constructor(proxyRepo, healthQueue) {
        this.proxyRepo = proxyRepo;
        this.healthQueue = healthQueue;
        this.logger = new common_1.Logger(CircuitBreakerHealthWorker_1.name);
    }
    async scheduleHealthProbes() {
        const activeProxies = await this.proxyRepo.find({
            where: { isActive: true },
            select: ['id', 'label', 'assignedAccountId'],
        });
        if (activeProxies.length === 0)
            return;
        this.logger.debug(`[CB Health] Scheduling ${activeProxies.length} health probe(s)…`);
        await Promise.all(activeProxies.map((proxy) => this.healthQueue.add('health-probe', { proxyId: proxy.id, accountId: proxy.assignedAccountId }, {
            jobId: `probe:${proxy.id}:${Math.floor(Date.now() / 30000)}`,
            priority: 5,
            removeOnComplete: true,
            removeOnFail: false,
        })));
    }
};
exports.CircuitBreakerHealthWorker = CircuitBreakerHealthWorker;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CircuitBreakerHealthWorker.prototype, "scheduleHealthProbes", null);
exports.CircuitBreakerHealthWorker = CircuitBreakerHealthWorker = CircuitBreakerHealthWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(proxy_pool_entity_1.ProxyPoolEntity)),
    __param(1, (0, bullmq_1.InjectQueue)('proxy-health-check')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        bullmq_2.Queue])
], CircuitBreakerHealthWorker);
//# sourceMappingURL=circuit-breaker-health.worker.js.map