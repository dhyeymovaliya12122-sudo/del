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
var SmartProxyRotatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartProxyRotatorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const net = require("net");
const proxy_pool_entity_1 = require("../../proxy-binding/entities/proxy-pool.entity");
const telemetry_service_1 = require("../../telemetry/services/telemetry.service");
let SmartProxyRotatorService = SmartProxyRotatorService_1 = class SmartProxyRotatorService {
    constructor(proxyRepo, telemetryService) {
        this.proxyRepo = proxyRepo;
        this.telemetryService = telemetryService;
        this.logger = new common_1.Logger(SmartProxyRotatorService_1.name);
    }
    async warmPingProxy(proxy, timeoutMs = 500) {
        const startTime = Date.now();
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(timeoutMs);
            socket.on('connect', () => {
                const latencyMs = Date.now() - startTime;
                socket.destroy();
                this.telemetryService?.setProxyLatency(proxy.id, latencyMs, proxy.host, proxy.protocol);
                resolve({ reachable: true, latencyMs });
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve({ reachable: false, latencyMs: timeoutMs });
            });
            socket.on('error', () => {
                socket.destroy();
                resolve({ reachable: false, latencyMs: Date.now() - startTime });
            });
            socket.connect(proxy.port, proxy.host);
        });
    }
    async rotateToCleanSubnet(accountId, failedProxyId) {
        let failedProxy = null;
        if (failedProxyId) {
            failedProxy = await this.proxyRepo.findOneBy({ id: failedProxyId });
            if (failedProxy) {
                failedProxy.isHealthy = false;
                failedProxy.is_healthy = false;
                failedProxy.lastHealthCheck = new Date();
                failedProxy.last_health_check = new Date();
                await this.proxyRepo.save(failedProxy);
                this.logger.warn(`🛑 [Self-Healing] Tripped circuit on proxy: ${failedProxy.host}:${failedProxy.port}`);
            }
        }
        const subnetPrefix = failedProxy && failedProxy.host.includes('.')
            ? failedProxy.host.split('.').slice(0, 2).join('.')
            : '';
        const qb = this.proxyRepo.createQueryBuilder('p')
            .where('(p.isActive = :active OR p.is_active = :active)', { active: true })
            .andWhere('(p.isHealthy = :healthy OR p.is_healthy = :healthy)', { healthy: true });
        if (subnetPrefix) {
            qb.andWhere('p.host NOT LIKE :subnet', { subnet: `${subnetPrefix}%` });
        }
        let candidates = await qb.orderBy('p.lastHealthCheck', 'ASC').getMany();
        if (candidates.length === 0) {
            this.logger.warn(`⚠️ [Self-Healing] No candidates outside subnet ${subnetPrefix}. Searching broader healthy pool...`);
            candidates = await this.proxyRepo.find({
                where: { isActive: true, isHealthy: true },
                order: { lastHealthCheck: 'ASC' },
            });
        }
        if (candidates.length === 0) {
            throw new Error('Critical: Proxy pool exhausted across all subnets.');
        }
        const selected = candidates[0];
        selected.assignedAccountId = accountId;
        selected.assigned_account_id = accountId;
        selected.lastHealthCheck = new Date();
        selected.last_health_check = new Date();
        await this.proxyRepo.save(selected);
        this.logger.log(`🟢 [Self-Healing] Assigned clean proxy ${selected.host}:${selected.port} on independent subnet to account ${accountId}`);
        return selected;
    }
};
exports.SmartProxyRotatorService = SmartProxyRotatorService;
exports.SmartProxyRotatorService = SmartProxyRotatorService = SmartProxyRotatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(proxy_pool_entity_1.ProxyPoolEntity)),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        telemetry_service_1.TelemetryService])
], SmartProxyRotatorService);
//# sourceMappingURL=smart-proxy-rotator.service.js.map