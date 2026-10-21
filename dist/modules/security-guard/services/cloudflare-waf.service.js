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
var CloudflareWafService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareWafService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let CloudflareWafService = CloudflareWafService_1 = class CloudflareWafService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(CloudflareWafService_1.name);
        this.zoneId = config.get('security.cloudflareZoneId', '');
        const token = config.get('security.cloudflareApiToken', '');
        this.baseUrl = `https://api.cloudflare.com/client/v4/zones/${this.zoneId}`;
        this.headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }
    async blockIp(ip, notes = 'Automated block: repeated HMAC failures') {
        if (!this.zoneId) {
            this.logger.warn('Cloudflare Zone ID not configured — skipping IP block');
            return;
        }
        try {
            await axios_1.default.post(`${this.baseUrl}/firewall/access-rules/rules`, {
                mode: 'block',
                configuration: { target: 'ip', value: ip },
                notes,
            }, { headers: this.headers });
            this.logger.warn(`🚫 Cloudflare WAF: Blocked IP ${ip}`);
        }
        catch (err) {
            this.logger.error(`Failed to block IP ${ip} via Cloudflare: ${err.message}`);
        }
    }
    async getFirewallRules() {
        if (!this.zoneId)
            return [];
        const res = await axios_1.default.get(`${this.baseUrl}/firewall/access-rules/rules`, { headers: this.headers });
        return res.data?.result ?? [];
    }
};
exports.CloudflareWafService = CloudflareWafService;
exports.CloudflareWafService = CloudflareWafService = CloudflareWafService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudflareWafService);
//# sourceMappingURL=cloudflare-waf.service.js.map