"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestrationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const container_instance_entity_1 = require("./entities/container-instance.entity");
const container_heal_log_entity_1 = require("./entities/container-heal-log.entity");
const docker_swarm_service_1 = require("./services/docker-swarm.service");
const coolify_service_1 = require("./services/coolify.service");
const noop_orchestrator_service_1 = require("./services/noop-orchestrator.service");
const auto_heal_worker_1 = require("./workers/auto-heal.worker");
const orchestration_controller_1 = require("./controllers/orchestration.controller");
const realtime_gateway_module_1 = require("../realtime-gateway/realtime-gateway.module");
const accounts_module_1 = require("../accounts/accounts.module");
const session_hydration_module_1 = require("../session-hydration/session-hydration.module");
const container_orchestrator_interface_1 = require("./interfaces/container-orchestrator.interface");
let OrchestrationModule = class OrchestrationModule {
};
exports.OrchestrationModule = OrchestrationModule;
exports.OrchestrationModule = OrchestrationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([container_instance_entity_1.ContainerInstanceEntity, container_heal_log_entity_1.ContainerHealLogEntity]),
            realtime_gateway_module_1.RealtimeGatewayModule,
            accounts_module_1.AccountsModule,
            session_hydration_module_1.SessionHydrationModule,
        ],
        controllers: [orchestration_controller_1.OrchestrationController],
        providers: [
            docker_swarm_service_1.DockerSwarmService,
            coolify_service_1.CoolifyService,
            noop_orchestrator_service_1.NoopOrchestratorService,
            {
                provide: container_orchestrator_interface_1.CONTAINER_ORCHESTRATOR_TOKEN,
                inject: [config_1.ConfigService, docker_swarm_service_1.DockerSwarmService, coolify_service_1.CoolifyService, noop_orchestrator_service_1.NoopOrchestratorService],
                useFactory: (config, swarm, coolify, noop) => {
                    const type = (config.get('ORCHESTRATOR_TYPE') || process.env.ORCHESTRATOR_TYPE || 'none').toLowerCase();
                    if (type === 'coolify') {
                        return coolify;
                    }
                    if (type === 'swarm') {
                        return swarm;
                    }
                    return noop;
                },
            },
            auto_heal_worker_1.AutoHealWorker,
        ],
        exports: [container_orchestrator_interface_1.CONTAINER_ORCHESTRATOR_TOKEN, auto_heal_worker_1.AutoHealWorker],
    })
], OrchestrationModule);
//# sourceMappingURL=orchestration.module.js.map