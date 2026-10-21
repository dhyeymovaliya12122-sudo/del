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
exports.MessageQueueController = void 0;
const common_1 = require("@nestjs/common");
const outbound_message_queue_service_1 = require("../services/outbound-message-queue.service");
const queue_rate_limiter_service_1 = require("../services/queue-rate-limiter.service");
let MessageQueueController = class MessageQueueController {
    constructor(queueService, rateLimiterService) {
        this.queueService = queueService;
        this.rateLimiterService = rateLimiterService;
    }
    async sendMessage(body) {
        return this.queueService.enqueue(body);
    }
    async getQueueStats(accountId) {
        return this.queueService.getQueueStats(accountId);
    }
    async pauseQueue(accountId) {
        await this.queueService.pauseAccountQueue(accountId);
        return { message: `Queue paused for account ${accountId}` };
    }
    async resumeQueue(accountId) {
        await this.queueService.resumeAccountQueue(accountId);
        return { message: `Queue resumed for account ${accountId}` };
    }
    async getRateLimits() {
        return this.rateLimiterService.getActiveRateLimits();
    }
    async getAccountRate(accountId) {
        const current = await this.rateLimiterService.getCurrentRate(accountId);
        const limit = await this.rateLimiterService.checkRateLimit(accountId);
        return { accountId, currentRate: current, allowed: limit.allowed, remaining: limit.remaining };
    }
};
exports.MessageQueueController = MessageQueueController;
__decorate([
    (0, common_1.Post)('send'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessageQueueController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)(':accountId/stats'),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MessageQueueController.prototype, "getQueueStats", null);
__decorate([
    (0, common_1.Post)(':accountId/pause'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MessageQueueController.prototype, "pauseQueue", null);
__decorate([
    (0, common_1.Post)(':accountId/resume'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MessageQueueController.prototype, "resumeQueue", null);
__decorate([
    (0, common_1.Get)('rate-limits'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MessageQueueController.prototype, "getRateLimits", null);
__decorate([
    (0, common_1.Get)(':accountId/rate'),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MessageQueueController.prototype, "getAccountRate", null);
exports.MessageQueueController = MessageQueueController = __decorate([
    (0, common_1.Controller)('message-queue'),
    __metadata("design:paramtypes", [outbound_message_queue_service_1.OutboundMessageQueueService,
        queue_rate_limiter_service_1.QueueRateLimiterService])
], MessageQueueController);
//# sourceMappingURL=message-queue.controller.js.map