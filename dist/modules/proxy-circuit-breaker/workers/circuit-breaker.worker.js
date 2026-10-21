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
var CircuitBreakerWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerWorker = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const https_proxy_agent_1 = require("https-proxy-agent");
const axios_1 = require("axios");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const proxy_pool_entity_1 = require("../../proxy-binding/entities/proxy-pool.entity");
const proxy_circuit_breaker_service_1 = require("../services/proxy-circuit-breaker.service");
const PROBE_URL = 'https://httpbin.org/ip';
const PROBE_TIMEOUT_MS = 8000;
let CircuitBreakerWorker = CircuitBreakerWorker_1 = class CircuitBreakerWorker extends bullmq_1.WorkerHost {
    constructor(proxyRepo, circuitBreakerService) {
        super();
        this.proxyRepo = proxyRepo;
        this.circuitBreakerService = circuitBreakerService;
        this.logger = new common_1.Logger(CircuitBreakerWorker_1.name);
    }
    async process(job) {
        const { proxyId, accountId } = job.data;
        if (job.name === 'circuit-reset') {
            return this.handleCircuitReset(proxyId, accountId);
        }
        if (job.name === 'health-probe') {
            return this.handleHealthProbe(proxyId, accountId);
        }
    }
    async handleHealthProbe(proxyId, accountId) {
        const proxy = await this.proxyRepo.findOne({ where: { id: proxyId } });
        if (!proxy) {
            this.logger.warn(`[CB Worker] Proxy ${proxyId} not found — skipping probe`);
            return;
        }
        const proxyUrl = proxy.toUrl();
        const agent = proxy.protocol === 'socks5'
            ? new socks_proxy_agent_1.SocksProxyAgent(proxyUrl)
            : new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
        try {
            await axios_1.default.get(PROBE_URL, {
                httpsAgent: agent,
                timeout: PROBE_TIMEOUT_MS,
                validateStatus: (s) => s < 500,
            });
            this.logger.log(`[CB Worker] ✅ Probe PASS for proxy [${proxy.label}]`);
            await this.circuitBreakerService.recordSuccess(proxyId);
        }
        catch (err) {
            this.logger.warn(`[CB Worker] ❌ Probe FAIL for proxy [${proxy.label}]: ${err.message}`);
            await this.circuitBreakerService.recordFailure(proxyId, accountId);
        }
    }
    async handleCircuitReset(proxyId, accountId) {
        const currentState = await this.circuitBreakerService.getState(proxyId);
        if (currentState !== 'OPEN') {
            this.logger.debug(`[CB Worker] Reset job fired but proxy ${proxyId} is already ${currentState}. Skipping.`);
            return;
        }
        this.logger.log(`[CB Worker] ⏱  Reset timer fired. Moving proxy ${proxyId} → HALF_OPEN`);
        await this.circuitBreakerService.halfOpenCircuit(proxyId, accountId);
        const queue = this.worker?.queue;
        if (queue) {
            await queue.add('health-probe', { proxyId, accountId }, { priority: 1 });
        }
    }
};
exports.CircuitBreakerWorker = CircuitBreakerWorker;
exports.CircuitBreakerWorker = CircuitBreakerWorker = CircuitBreakerWorker_1 = __decorate([
    (0, bullmq_1.Processor)('proxy-health-check'),
    __param(0, (0, typeorm_1.InjectRepository)(proxy_pool_entity_1.ProxyPoolEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        proxy_circuit_breaker_service_1.ProxyCircuitBreakerService])
], CircuitBreakerWorker);
//# sourceMappingURL=circuit-breaker.worker.js.map