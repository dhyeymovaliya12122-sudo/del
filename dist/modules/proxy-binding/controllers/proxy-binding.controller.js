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
exports.ProxyBindingController = void 0;
const common_1 = require("@nestjs/common");
const proxy_binding_service_1 = require("../services/proxy-binding.service");
const proxy_rotation_service_1 = require("../services/proxy-rotation.service");
const proxy_health_service_1 = require("../services/proxy-health.service");
const register_proxies_dto_1 = require("../dto/register-proxies.dto");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const app_user_entity_1 = require("../../auth/entities/app-user.entity");
let ProxyBindingController = class ProxyBindingController {
    constructor(proxyBindingService, proxyRotationService, proxyHealthService) {
        this.proxyBindingService = proxyBindingService;
        this.proxyRotationService = proxyRotationService;
        this.proxyHealthService = proxyHealthService;
    }
    async registerProxies(dto) {
        return this.proxyBindingService.registerProxies(dto.proxies);
    }
    async getAccountProxy(accountId) {
        return this.proxyBindingService.assignProxyToAccount(accountId);
    }
    async rotateProxy(accountId) {
        return this.proxyRotationService.rotateForAccount(accountId);
    }
    async releaseProxy(accountId) {
        return this.proxyBindingService.releaseProxy(accountId);
    }
};
exports.ProxyBindingController = ProxyBindingController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_proxies_dto_1.RegisterProxiesDto]),
    __metadata("design:returntype", Promise)
], ProxyBindingController.prototype, "registerProxies", null);
__decorate([
    (0, common_1.Get)('account/:accountId'),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProxyBindingController.prototype, "getAccountProxy", null);
__decorate([
    (0, common_1.Post)('account/:accountId/rotate'),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProxyBindingController.prototype, "rotateProxy", null);
__decorate([
    (0, common_1.Delete)('account/:accountId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProxyBindingController.prototype, "releaseProxy", null);
exports.ProxyBindingController = ProxyBindingController = __decorate([
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.Controller)('proxy-binding'),
    __metadata("design:paramtypes", [proxy_binding_service_1.ProxyBindingService,
        proxy_rotation_service_1.ProxyRotationService,
        proxy_health_service_1.ProxyHealthService])
], ProxyBindingController);
//# sourceMappingURL=proxy-binding.controller.js.map