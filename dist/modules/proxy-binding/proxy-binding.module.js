"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyBindingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const proxy_pool_entity_1 = require("./entities/proxy-pool.entity");
const proxy_binding_service_1 = require("./services/proxy-binding.service");
const proxy_health_service_1 = require("./services/proxy-health.service");
const proxy_rotation_service_1 = require("./services/proxy-rotation.service");
const proxy_binding_controller_1 = require("./controllers/proxy-binding.controller");
let ProxyBindingModule = class ProxyBindingModule {
};
exports.ProxyBindingModule = ProxyBindingModule;
exports.ProxyBindingModule = ProxyBindingModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([proxy_pool_entity_1.ProxyPoolEntity])],
        controllers: [proxy_binding_controller_1.ProxyBindingController],
        providers: [
            proxy_binding_service_1.ProxyBindingService,
            proxy_health_service_1.ProxyHealthService,
            proxy_rotation_service_1.ProxyRotationService,
        ],
        exports: [proxy_binding_service_1.ProxyBindingService],
    })
], ProxyBindingModule);
//# sourceMappingURL=proxy-binding.module.js.map