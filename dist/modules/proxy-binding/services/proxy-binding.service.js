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
var ProxyBindingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyBindingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const https_proxy_agent_1 = require("https-proxy-agent");
const http_proxy_agent_1 = require("http-proxy-agent");
const proxy_pool_entity_1 = require("../entities/proxy-pool.entity");
let ProxyBindingService = ProxyBindingService_1 = class ProxyBindingService {
    constructor(proxyRepo, config) {
        this.proxyRepo = proxyRepo;
        this.config = config;
        this.logger = new common_1.Logger(ProxyBindingService_1.name);
    }
    async assignProxyToAccount(accountId) {
        let proxy = await this.proxyRepo.findOne({
            where: { assignedAccountId: accountId, isActive: true, isHealthy: true },
        });
        if (!proxy) {
            proxy = await this.proxyRepo.findOne({
                where: { isActive: true, isHealthy: true, assignedAccountId: undefined },
                order: { createdAt: 'ASC' },
            });
            if (!proxy) {
                throw new common_1.NotFoundException(`No healthy proxy available to assign to account ${accountId}`);
            }
            proxy.assignedAccountId = accountId;
            await this.proxyRepo.save(proxy);
            this.logger.log(`Assigned proxy [${proxy.label}] → account [${accountId}]`);
        }
        return proxy;
    }
    async buildAgentBundle(accountId) {
        const proxy = await this.assignProxyToAccount(accountId);
        const proxyUrl = proxy.toUrl();
        this.logger.debug(`Building ${proxy.protocol.toUpperCase()} agent for account ${accountId}`);
        if (proxy.protocol === 'socks5') {
            const agent = new socks_proxy_agent_1.SocksProxyAgent(proxyUrl);
            return {
                httpsAgent: agent,
                httpAgent: agent,
                proxyUrl,
                protocol: 'socks5',
            };
        }
        return {
            httpsAgent: new https_proxy_agent_1.HttpsProxyAgent(proxyUrl),
            httpAgent: new http_proxy_agent_1.HttpProxyAgent(proxyUrl),
            proxyUrl,
            protocol: proxy.protocol,
        };
    }
    async releaseProxy(accountId) {
        await this.proxyRepo.update({ assignedAccountId: accountId }, { assignedAccountId: undefined });
        this.logger.warn(`Released proxy binding for account ${accountId}`);
    }
    async registerProxies(proxies) {
        const entities = this.proxyRepo.create(proxies);
        return this.proxyRepo.save(entities);
    }
};
exports.ProxyBindingService = ProxyBindingService;
exports.ProxyBindingService = ProxyBindingService = ProxyBindingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(proxy_pool_entity_1.ProxyPoolEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], ProxyBindingService);
//# sourceMappingURL=proxy-binding.service.js.map