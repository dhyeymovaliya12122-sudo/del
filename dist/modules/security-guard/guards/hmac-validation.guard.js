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
var HmacValidationGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HmacValidationGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
let HmacValidationGuard = HmacValidationGuard_1 = class HmacValidationGuard {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(HmacValidationGuard_1.name);
        this.secret = config.get('WEBHOOK_HMAC_SECRET') || process.env.WEBHOOK_HMAC_SECRET || 'change_me';
        const isProd = (config.get('NODE_ENV') || process.env.NODE_ENV) === 'production';
        const weakPlaceholders = ['change_me', 'supersecretkey', 'secret', 'default', '123456'];
        if (isProd && weakPlaceholders.some((w) => this.secret.toLowerCase().includes(w))) {
            throw new Error('🚨 [SECURITY FATAL] WEBHOOK_HMAC_SECRET must be set to your real Meta App Secret in production (cannot use placeholders like supersecretkey or change_me).');
        }
        this.signatureHeader = config.get('security.webhookSignatureHeader', 'x-hub-signature-256');
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const incomingSignature = request.headers[this.signatureHeader];
        if (!incomingSignature) {
            this.logger.warn(`[HMAC] Missing signature header [${this.signatureHeader}] from ${request.ip}`);
            throw new common_1.UnauthorizedException(`Missing required signature header: ${this.signatureHeader}`);
        }
        const rawBody = request.rawBody;
        if (!rawBody) {
            this.logger.error('[HMAC] rawBody not set on request. Ensure raw body middleware is active.');
            throw new common_1.UnauthorizedException('Cannot validate signature: raw body unavailable');
        }
        const expectedSignature = `sha256=${this.computeHmac(rawBody)}`;
        const isValid = this.timingSafeEqual(incomingSignature, expectedSignature);
        if (!isValid) {
            this.logger.warn(`[HMAC] ❌ INVALID signature from ${request.ip} on ${request.path}`);
            throw new common_1.UnauthorizedException('Invalid HMAC signature');
        }
        this.logger.debug(`[HMAC] ✅ Signature verified for ${request.path}`);
        return true;
    }
    computeHmac(body) {
        return crypto
            .createHmac('sha256', this.secret)
            .update(body)
            .digest('hex');
    }
    timingSafeEqual(a, b) {
        const bufA = crypto.createHash('sha256').update(a).digest();
        const bufB = crypto.createHash('sha256').update(b).digest();
        const digestsMatch = crypto.timingSafeEqual(bufA, bufB);
        return digestsMatch && a.length === b.length;
    }
};
exports.HmacValidationGuard = HmacValidationGuard;
exports.HmacValidationGuard = HmacValidationGuard = HmacValidationGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], HmacValidationGuard);
//# sourceMappingURL=hmac-validation.guard.js.map