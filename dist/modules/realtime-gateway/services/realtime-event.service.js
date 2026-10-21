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
var RealtimeEventService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeEventService = void 0;
const common_1 = require("@nestjs/common");
const realtime_gateway_1 = require("../gateways/realtime.gateway");
let RealtimeEventService = RealtimeEventService_1 = class RealtimeEventService {
    constructor(gateway) {
        this.gateway = gateway;
        this.logger = new common_1.Logger(RealtimeEventService_1.name);
    }
    emitToAccount(tenantId, accountId, event, payload) {
        this.gateway.emitToAccount(tenantId, accountId, event, payload);
    }
    emitToTenant(tenantId, event, payload) {
        this.gateway.emitToTenant(tenantId, event, payload);
    }
    emitIncomingMessage(tenantId, accountId, event) {
        this.gateway.emitToAccount(tenantId, accountId, 'message:incoming', event);
        this.logger.debug(`[WS] message:incoming → tenant:${tenantId} account:${accountId}`);
    }
    emitDeliveryStatus(tenantId, accountId, event) {
        const room = `tenant:${tenantId}:account:${accountId}:status`;
        this.gateway.server?.to(room).emit('message:status', event);
    }
    emitMediaReady(tenantId, accountId, event) {
        const room = `tenant:${tenantId}:account:${accountId}:media`;
        this.gateway.server?.to(room).emit('media:ready', event);
        this.logger.debug(`[WS] media:ready → messageId: ${event.messageId}`);
    }
    emitCircuitBreakerAlert(tenantId, accountId, proxyId, state) {
        this.gateway.emitToTenant(tenantId, 'proxy:circuit-breaker', {
            accountId,
            proxyId,
            state,
            timestamp: Date.now(),
        });
    }
    emitQRCode(tenantId, accountId, qrCodeDataUrl) {
        this.gateway.emitToAccount(tenantId, accountId, 'whatsapp.qr', {
            accountId,
            qrCodeDataUrl,
            timestamp: Date.now(),
        });
        this.logger.debug(`[WS] whatsapp.qr → tenant:${tenantId} account:${accountId}`);
    }
};
exports.RealtimeEventService = RealtimeEventService;
exports.RealtimeEventService = RealtimeEventService = RealtimeEventService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [realtime_gateway_1.RealtimeGateway])
], RealtimeEventService);
//# sourceMappingURL=realtime-event.service.js.map