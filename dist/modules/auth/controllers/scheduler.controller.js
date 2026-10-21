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
exports.SchedulerController = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const scheduler_service_1 = require("../services/scheduler.service");
let SchedulerController = class SchedulerController {
    constructor(schedulerService, jwtService) {
        this.schedulerService = schedulerService;
        this.jwtService = jwtService;
    }
    getUser(auth) {
        if (!auth)
            throw new common_1.UnauthorizedException('No token');
        return this.jwtService.verify(auth.replace('Bearer ', ''));
    }
    async getScheduledRoot(auth, accountId) {
        this.getUser(auth);
        return this.schedulerService.getScheduledMessages(accountId);
    }
    async getScheduled(auth, accountId) {
        this.getUser(auth);
        return this.schedulerService.getScheduledMessages(accountId);
    }
    async scheduleMessageRoot(auth, body) {
        this.getUser(auth);
        return this.schedulerService.createScheduledMessage({
            ...body,
            scheduledAt: new Date(body.scheduledAt),
        });
    }
    async scheduleMessage(auth, body) {
        this.getUser(auth);
        return this.schedulerService.createScheduledMessage({
            ...body,
            scheduledAt: new Date(body.scheduledAt),
        });
    }
    async cancel(auth, id, accountId) {
        this.getUser(auth);
        return this.schedulerService.cancelScheduledMessage(id, accountId);
    }
    async delete(auth, id, accountId) {
        this.getUser(auth);
        return this.schedulerService.deleteScheduledMessage(id, accountId);
    }
};
exports.SchedulerController = SchedulerController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getScheduledRoot", null);
__decorate([
    (0, common_1.Get)('messages'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getScheduled", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "scheduleMessageRoot", null);
__decorate([
    (0, common_1.Post)('schedule'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "scheduleMessage", null);
__decorate([
    (0, common_1.Post)('cancel/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Headers)('authorization')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "delete", null);
exports.SchedulerController = SchedulerController = __decorate([
    (0, common_1.Controller)('scheduler'),
    __metadata("design:paramtypes", [scheduler_service_1.SchedulerService,
        jwt_1.JwtService])
], SchedulerController);
//# sourceMappingURL=scheduler.controller.js.map