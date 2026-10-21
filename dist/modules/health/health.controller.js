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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const public_decorator_1 = require("../../common/decorators/public.decorator");
let HealthController = class HealthController {
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'whatsapp-core-engine',
            phase: 'Phase 1 — Core Engine & Anti-Ban Foundation',
            features: {
                proxyBinding: 'active',
                sessionHydration: 'active',
                securityGuard: 'active',
            },
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Controller)('health')
], HealthController);
//# sourceMappingURL=health.controller.js.map