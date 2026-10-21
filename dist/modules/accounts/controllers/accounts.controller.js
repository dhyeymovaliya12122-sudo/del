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
exports.AccountsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const accounts_service_1 = require("../services/accounts.service");
const session_hydration_service_1 = require("../../session-hydration/services/session-hydration.service");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const app_user_entity_1 = require("../../auth/entities/app-user.entity");
let AccountsController = class AccountsController {
    constructor(accountsService, sessionHydrationService) {
        this.accountsService = accountsService;
        this.sessionHydrationService = sessionHydrationService;
    }
    async listAccounts(req, tenantId, startDate, endDate, auth) {
        return this.accountsService.findAll(tenantId, req.user || auth, startDate, endDate);
    }
    async getAccount(id, req, tenantId, startDate, endDate, auth) {
        return this.accountsService.findOne(id, tenantId, req.user || auth, startDate, endDate);
    }
    async createAccount(body) {
        const account = await this.accountsService.create(body);
        this.sessionHydrationService.hydrateAccount(account.id).catch((err) => {
            console.error(`Failed to start QR flow for ${account.id}:`, err);
        });
        return account;
    }
    async updateAccount(id, body) {
        return this.accountsService.update(id, body);
    }
    async updateStatus(id, body) {
        await this.accountsService.updateStatus(id, body.status);
        return { id, status: body.status };
    }
    async deleteAccount(id) {
        return this.accountsService.delete(id);
    }
    async getLinkedDevices(id) {
        return this.accountsService.getLinkedDevices(id);
    }
    async pairDevice(id, body) {
        return this.accountsService.pairDevice(id, body);
    }
    async approveDevice(id, body) {
        return this.accountsService.approveDevice(id, body);
    }
    async revokeDevice(id, deviceId) {
        return this.accountsService.revokeDevice(id, deviceId);
    }
};
exports.AccountsController = AccountsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "listAccounts", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Query)('tenantId')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "getAccount", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "createAccount", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "updateAccount", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "deleteAccount", null);
__decorate([
    (0, common_1.Get)(':id/devices'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "getLinkedDevices", null);
__decorate([
    (0, common_1.Post)(':id/devices/pair'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "pairDevice", null);
__decorate([
    (0, common_1.Post)(':id/devices/approve'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "approveDevice", null);
__decorate([
    (0, common_1.Delete)(':id/devices/:deviceId'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AccountsController.prototype, "revokeDevice", null);
exports.AccountsController = AccountsController = __decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('accounts'),
    __metadata("design:paramtypes", [accounts_service_1.AccountsService,
        session_hydration_service_1.SessionHydrationService])
], AccountsController);
//# sourceMappingURL=accounts.controller.js.map