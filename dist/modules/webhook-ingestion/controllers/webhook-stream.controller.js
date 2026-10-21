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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookStreamController = void 0;
const common_1 = require("@nestjs/common");
const redis_stream_publisher_service_1 = require("../services/redis-stream-publisher.service");
const redis_stream_consumer_service_1 = require("../services/redis-stream-consumer.service");
const hmac_validation_guard_1 = require("../../security-guard/guards/hmac-validation.guard");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_1 = require("../../../common/decorators/public.decorator");
let WebhookStreamController = class WebhookStreamController {
    constructor(publisher, consumer) {
        this.publisher = publisher;
        this.consumer = consumer;
    }
    async receiveWebhook(tenantId, accountId, body, hmacSignature) {
        const eventType = body?.entry?.[0]?.changes?.[0]?.field ?? 'unknown';
        const entryTime = body?.entry?.[0]?.time;
        if (entryTime && typeof entryTime === 'number') {
            const nowSec = Math.floor(Date.now() / 1000);
            if (Math.abs(nowSec - entryTime) > 900) {
                console.warn(`[Webhook] Stale/replayed webhook rejected (time difference: ${Math.abs(nowSec - entryTime)}s)`);
                return { status: 'stale_rejected', buffered: false };
            }
        }
        await this.publisher.publish({
            tenantId,
            accountId,
            eventType,
            rawPayload: body,
            hmacSignature,
        }).catch((err) => {
            console.error(`[Webhook] Stream publish failed: ${err.message} — falling back to sync`);
        });
        return { status: 'ok', buffered: true };
    }
    verifyWebhook(mode, challenge, verifyToken) {
        const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN ?? 'whatsapp_verify';
        if (mode === 'subscribe' && verifyToken === expectedToken) {
            return challenge;
        }
        return 'Forbidden';
    }
    async getStreamHealth() {
        const [streamInfo, lag] = await Promise.all([
            this.publisher.getStreamInfo(),
            this.consumer.getLag(),
        ]);
        return { ...streamInfo, lag };
    }
};
exports.WebhookStreamController = WebhookStreamController;
__decorate([
    (0, common_1.Post)(':tenantId/:accountId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(hmac_validation_guard_1.HmacValidationGuard),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Param)('accountId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)('x-hub-signature-256')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String]),
    __metadata("design:returntype", Promise)
], WebhookStreamController.prototype, "receiveWebhook", null);
__decorate([
    (0, common_1.Get)(':tenantId/:accountId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.challenge')),
    __param(2, (0, common_1.Query)('hub.verify_token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", String)
], WebhookStreamController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Get)('stream/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebhookStreamController.prototype, "getStreamHealth", null);
exports.WebhookStreamController = WebhookStreamController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)('webhook'),
    __metadata("design:paramtypes", [redis_stream_publisher_service_1.RedisStreamPublisherService,
        redis_stream_consumer_service_1.RedisStreamConsumerService])
], WebhookStreamController);
//# sourceMappingURL=webhook-stream.controller.js.map