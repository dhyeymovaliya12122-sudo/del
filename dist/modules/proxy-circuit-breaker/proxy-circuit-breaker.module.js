"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyCircuitBreakerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const proxy_circuit_breaker_entity_1 = require("./entities/proxy-circuit-breaker.entity");
const proxy_circuit_breaker_service_1 = require("./services/proxy-circuit-breaker.service");
const smart_proxy_rotator_service_1 = require("./services/smart-proxy-rotator.service");
const circuit_breaker_worker_1 = require("./workers/circuit-breaker.worker");
const circuit_breaker_health_worker_1 = require("./workers/circuit-breaker-health.worker");
const proxy_circuit_breaker_controller_1 = require("./controllers/proxy-circuit-breaker.controller");
const proxy_binding_module_1 = require("../proxy-binding/proxy-binding.module");
const proxy_pool_entity_1 = require("../proxy-binding/entities/proxy-pool.entity");
let ProxyCircuitBreakerModule = class ProxyCircuitBreakerModule {
};
exports.ProxyCircuitBreakerModule = ProxyCircuitBreakerModule;
exports.ProxyCircuitBreakerModule = ProxyCircuitBreakerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([proxy_circuit_breaker_entity_1.ProxyCircuitBreakerEntity, proxy_pool_entity_1.ProxyPoolEntity]),
            bullmq_1.BullModule.registerQueue({
                name: 'proxy-health-check',
                defaultJobOptions: {
                    removeOnComplete: 50,
                    removeOnFail: 100,
                    attempts: 1,
                    backoff: { type: 'exponential', delay: 5000 },
                },
            }),
            proxy_binding_module_1.ProxyBindingModule,
        ],
        controllers: [proxy_circuit_breaker_controller_1.ProxyCircuitBreakerController],
        providers: [
            proxy_circuit_breaker_service_1.ProxyCircuitBreakerService,
            smart_proxy_rotator_service_1.SmartProxyRotatorService,
            circuit_breaker_worker_1.CircuitBreakerWorker,
            circuit_breaker_health_worker_1.CircuitBreakerHealthWorker,
        ],
        exports: [proxy_circuit_breaker_service_1.ProxyCircuitBreakerService, smart_proxy_rotator_service_1.SmartProxyRotatorService],
    })
], ProxyCircuitBreakerModule);
//# sourceMappingURL=proxy-circuit-breaker.module.js.map