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
exports.SessionHydrationController = void 0;
const common_1 = require("@nestjs/common");
const session_hydration_service_1 = require("../services/session-hydration.service");
const baileys_client_factory_1 = require("../factories/baileys-client.factory");
const account_warmup_service_1 = require("../services/account-warmup.service");
const distributed_socket_manager_service_1 = require("../services/distributed-socket-manager.service");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const app_user_entity_1 = require("../../auth/entities/app-user.entity");
let SessionHydrationController = class SessionHydrationController {
    constructor(hydrationService, clientFactory, warmupService, socketManager) {
        this.hydrationService = hydrationService;
        this.clientFactory = clientFactory;
        this.warmupService = warmupService;
        this.socketManager = socketManager;
    }
    async hydrateAccount(accountId) {
        await this.hydrationService.hydrateAccount(accountId);
        return { message: `Session hydrated for account ${accountId}` };
    }
    async terminateAccount(accountId) {
        return this.hydrationService.terminateAccount(accountId);
    }
    async getActiveClients() {
        return {
            activeClients: this.clientFactory.getActiveClients(),
            count: this.clientFactory.getActiveClients().length,
        };
    }
    async getWarmupStatus(accountId) {
        return this.warmupService.getWarmupProfile(accountId);
    }
    async getClusterLease(accountId) {
        return this.socketManager.getClusterStatus(accountId);
    }
};
exports.SessionHydrationController = SessionHydrationController;
__decorate([
    (0, common_1.Post)(':accountId/start'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SessionHydrationController.prototype, "hydrateAccount", null);
__decorate([
    (0, common_1.Delete)(':accountId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SessionHydrationController.prototype, "terminateAccount", null);
__decorate([
    (0, common_1.Get)('active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SessionHydrationController.prototype, "getActiveClients", null);
__decorate([
    (0, common_1.Get)(':accountId/warmup-status'),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SessionHydrationController.prototype, "getWarmupStatus", null);
__decorate([
    (0, common_1.Get)(':accountId/cluster-lease'),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SessionHydrationController.prototype, "getClusterLease", null);
exports.SessionHydrationController = SessionHydrationController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.Controller)('session-hydration'),
    __metadata("design:paramtypes", [session_hydration_service_1.SessionHydrationService,
        baileys_client_factory_1.BaileysClientFactory,
        account_warmup_service_1.AccountWarmupService,
        distributed_socket_manager_service_1.DistributedSocketManagerService])
], SessionHydrationController);
//# sourceMappingURL=session-hydration.controller.js.map