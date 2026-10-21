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
exports.ProxyCircuitBreakerController = void 0;
const common_1 = require("@nestjs/common");
const proxy_circuit_breaker_service_1 = require("../services/proxy-circuit-breaker.service");
const smart_proxy_rotator_service_1 = require("../services/smart-proxy-rotator.service");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const app_user_entity_1 = require("../../auth/entities/app-user.entity");
let ProxyCircuitBreakerController = class ProxyCircuitBreakerController {
    constructor(cbService, proxyRotator) {
        this.cbService = cbService;
        this.proxyRotator = proxyRotator;
    }
    async getAllStates() {
        return this.cbService.getAllCircuitStates();
    }
    async getState(proxyId) {
        const state = await this.cbService.getState(proxyId);
        return { proxyId, state };
    }
    async resetCircuit(proxyId) {
        await this.cbService.closeCircuit(proxyId);
        return { message: `Circuit CLOSED (forced) for proxy ${proxyId}` };
    }
    async tripCircuit(proxyId) {
        await this.cbService.openCircuit(proxyId);
        return { message: `Circuit OPENED (forced) for proxy ${proxyId}` };
    }
    async rotateProxy(accountId, failedProxyId) {
        const rotated = await this.proxyRotator.rotateToCleanSubnet(accountId, failedProxyId);
        return {
            message: `Account ${accountId} successfully rotated to clean subnet proxy`,
            proxy: {
                id: rotated.id,
                host: rotated.host,
                port: rotated.port,
                protocol: rotated.protocol,
            },
        };
    }
};
exports.ProxyCircuitBreakerController = ProxyCircuitBreakerController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProxyCircuitBreakerController.prototype, "getAllStates", null);
__decorate([
    (0, common_1.Get)(':proxyId/state'),
    __param(0, (0, common_1.Param)('proxyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProxyCircuitBreakerController.prototype, "getState", null);
__decorate([
    (0, common_1.Post)(':proxyId/reset'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('proxyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProxyCircuitBreakerController.prototype, "resetCircuit", null);
__decorate([
    (0, common_1.Post)(':proxyId/trip'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('proxyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProxyCircuitBreakerController.prototype, "tripCircuit", null);
__decorate([
    (0, common_1.Post)('rotate/:accountId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('accountId')),
    __param(1, (0, common_1.Body)('failedProxyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProxyCircuitBreakerController.prototype, "rotateProxy", null);
exports.ProxyCircuitBreakerController = ProxyCircuitBreakerController = __decorate([
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN, app_user_entity_1.UserRole.ADMIN),
    (0, common_1.Controller)('proxy-circuit-breaker'),
    __metadata("design:paramtypes", [proxy_circuit_breaker_service_1.ProxyCircuitBreakerService,
        smart_proxy_rotator_service_1.SmartProxyRotatorService])
], ProxyCircuitBreakerController);
//# sourceMappingURL=proxy-circuit-breaker.controller.js.map