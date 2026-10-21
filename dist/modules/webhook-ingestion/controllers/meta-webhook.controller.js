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
var MetaWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaWebhookController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const meta_webhook_service_1 = require("../services/meta-webhook.service");
const public_decorator_1 = require("../../../common/decorators/public.decorator");
let MetaWebhookController = MetaWebhookController_1 = class MetaWebhookController {
    constructor(metaWebhookService, config) {
        this.metaWebhookService = metaWebhookService;
        this.config = config;
        this.logger = new common_1.Logger(MetaWebhookController_1.name);
    }
    verify(mode, token, challenge, res) {
        const verifyToken = this.config.get('META_WEBHOOK_VERIFY_TOKEN', 'whatsapp_verify_token_2024');
        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('✅ Meta webhook verified successfully');
            return res.status(common_1.HttpStatus.OK).send(challenge);
        }
        this.logger.warn(`❌ Meta webhook verification failed (token mismatch). Received: "${token}"`);
        return res.status(common_1.HttpStatus.FORBIDDEN).send('Forbidden');
    }
    async receive(body) {
        this.metaWebhookService.processPayload(body).catch(err => this.logger.error(`Webhook processing error: ${err.message}`, err.stack));
        return 'EVENT_RECEIVED';
    }
};
exports.MetaWebhookController = MetaWebhookController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], MetaWebhookController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MetaWebhookController.prototype, "receive", null);
exports.MetaWebhookController = MetaWebhookController = MetaWebhookController_1 = __decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)('webhook'),
    __metadata("design:paramtypes", [meta_webhook_service_1.MetaWebhookService,
        config_1.ConfigService])
], MetaWebhookController);
//# sourceMappingURL=meta-webhook.controller.js.map