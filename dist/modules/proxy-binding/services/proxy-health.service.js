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
var ProxyHealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyHealthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const https_proxy_agent_1 = require("https-proxy-agent");
const axios_1 = require("axios");
const proxy_pool_entity_1 = require("../entities/proxy-pool.entity");
const HEALTH_PROBE_URL = 'https://httpbin.org/ip';
let ProxyHealthService = ProxyHealthService_1 = class ProxyHealthService {
    constructor(proxyRepo, config) {
        this.proxyRepo = proxyRepo;
        this.config = config;
        this.logger = new common_1.Logger(ProxyHealthService_1.name);
    }
    async runHealthChecks() {
        const proxies = await this.proxyRepo.find({ where: { isActive: true } });
        this.logger.log(`Running health checks on ${proxies.length} proxies…`);
        await Promise.allSettled(proxies.map((proxy) => this.checkProxy(proxy)));
    }
    async checkProxy(proxy) {
        const timeout = this.config.get('proxy.timeoutMs', 10000);
        const proxyUrl = proxy.toUrl();
        let agent;
        if (proxy.protocol === 'socks5') {
            agent = new socks_proxy_agent_1.SocksProxyAgent(proxyUrl);
        }
        else {
            agent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl);
        }
        try {
            await axios_1.default.get(HEALTH_PROBE_URL, {
                httpsAgent: agent,
                timeout,
                validateStatus: (s) => s < 500,
            });
            if (!proxy.isHealthy) {
                await this.proxyRepo.update(proxy.id, { isHealthy: true, lastHealthCheck: new Date() });
                this.logger.log(`✅ Proxy [${proxy.label}] recovered`);
            }
            else {
                await this.proxyRepo.update(proxy.id, { lastHealthCheck: new Date() });
            }
            return true;
        }
        catch {
            if (proxy.isHealthy) {
                await this.proxyRepo.update(proxy.id, {
                    isHealthy: false,
                    lastHealthCheck: new Date(),
                });
                this.logger.warn(`❌ Proxy [${proxy.label}] marked UNHEALTHY`);
            }
            return false;
        }
    }
};
exports.ProxyHealthService = ProxyHealthService;
__decorate([
    (0, schedule_1.Interval)('proxyHealthCheck', 30000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProxyHealthService.prototype, "runHealthChecks", null);
exports.ProxyHealthService = ProxyHealthService = ProxyHealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(proxy_pool_entity_1.ProxyPoolEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], ProxyHealthService);
//# sourceMappingURL=proxy-health.service.js.map