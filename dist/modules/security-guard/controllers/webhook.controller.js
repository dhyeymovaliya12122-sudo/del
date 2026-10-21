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
var WebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const hmac_validation_guard_1 = require("../guards/hmac-validation.guard");
const webhook_ingestion_service_1 = require("../services/webhook-ingestion.service");
const public_decorator_1 = require("../../../common/decorators/public.decorator");
let WebhookController = WebhookController_1 = class WebhookController {
    constructor(webhookIngestionService, config) {
        this.webhookIngestionService = webhookIngestionService;
        this.config = config;
        this.logger = new common_1.Logger(WebhookController_1.name);
    }
    verifyWebhook(mode, token, challenge, res) {
        const verifyToken = this.config.get('security.webhookVerifyToken', '');
        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('✅ Webhook verification challenge accepted');
            return res.status(200).send(challenge);
        }
        this.logger.warn(`❌ Webhook verification failed. Token mismatch.`);
        return res.status(403).send('Forbidden');
    }
    async receiveWebhook(payload, req) {
        const sourceIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
        this.logger.log(`📥 Webhook received from ${sourceIp}`);
        await this.webhookIngestionService.processWebhook(payload, sourceIp);
        return { status: 'accepted' };
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Get)('whatsapp'),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], WebhookController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('whatsapp'),
    (0, common_1.UseGuards)(hmac_validation_guard_1.HmacValidationGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "receiveWebhook", null);
exports.WebhookController = WebhookController = WebhookController_1 = __decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [webhook_ingestion_service_1.WebhookIngestionService,
        config_1.ConfigService])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map