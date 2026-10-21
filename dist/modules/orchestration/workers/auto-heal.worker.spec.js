"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../../realtime-gateway/services/realtime-event.service', () => ({
    RealtimeEventService: class {
    },
}));
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const auto_heal_worker_1 = require("./auto-heal.worker");
const container_instance_entity_1 = require("../entities/container-instance.entity");
const container_heal_log_entity_1 = require("../entities/container-heal-log.entity");
const container_orchestrator_interface_1 = require("../interfaces/container-orchestrator.interface");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const realtime_event_service_1 = require("../../realtime-gateway/services/realtime-event.service");
describe('AutoHealWorker (Autonomous Self-Healing Swarm)', () => {
    let worker;
    let mockInstanceRepo;
    let mockHealLogRepo;
    let mockOrchestrator;
    let mockRealtimeService;
    let mockRedis;
    beforeEach(async () => {
        mockInstanceRepo = {
            find: jest.fn(),
            update: jest.fn().mockResolvedValue({}),
        };
        mockHealLogRepo = {
            create: jest.fn((dto) => dto),
            save: jest.fn().mockResolvedValue({}),
        };
        mockOrchestrator = {
            getHealth: jest.fn(),
            restart: jest.fn().mockResolvedValue({}),
        };
        mockRealtimeService = {
            emitCircuitBreakerAlert: jest.fn(),
        };
        mockRedis = {
            get: jest.fn(),
            set: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auto_heal_worker_1.AutoHealWorker,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(container_instance_entity_1.ContainerInstanceEntity),
                    useValue: mockInstanceRepo,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(container_heal_log_entity_1.ContainerHealLogEntity),
                    useValue: mockHealLogRepo,
                },
                {
                    provide: container_orchestrator_interface_1.CONTAINER_ORCHESTRATOR_TOKEN,
                    useValue: mockOrchestrator,
                },
                {
                    provide: cache_module_1.REDIS_CLIENT,
                    useValue: mockRedis,
                },
                {
                    provide: realtime_event_service_1.RealtimeEventService,
                    useValue: mockRealtimeService,
                },
                {
                    provide: config_1.ConfigService,
                    useValue: {
                        get: jest.fn((key, def) => def),
                    },
                },
            ],
        }).compile();
        worker = module.get(auto_heal_worker_1.AutoHealWorker);
    });
    describe('runAutoHeal', () => {
        it('should skip healing when instances are healthy and running', async () => {
            const healthyInstance = {
                id: 'inst-1',
                serviceId: 'srv-1',
                accountId: 'acc-1',
                tenantId: 'tenant-1',
                status: 'running',
                healCount: 0,
            };
            mockInstanceRepo.find.mockResolvedValue([healthyInstance]);
            mockOrchestrator.getHealth.mockResolvedValue({
                status: 'running',
                healthState: 'healthy',
                replicas: { desired: 1, running: 1 },
            });
            await worker.runAutoHeal();
            expect(mockOrchestrator.restart).not.toHaveBeenCalled();
            expect(mockRealtimeService.emitCircuitBreakerAlert).not.toHaveBeenCalled();
        });
        it('should autonomously heal an unhealthy instance with zero running replicas', async () => {
            const brokenInstance = {
                id: 'inst-broken',
                serviceId: 'srv-broken',
                accountId: 'acc-broken',
                tenantId: 'tenant-default',
                status: 'running',
                healCount: 2,
            };
            mockInstanceRepo.find.mockResolvedValue([brokenInstance]);
            mockOrchestrator.getHealth.mockResolvedValue({
                status: 'running',
                healthState: 'unhealthy',
                replicas: { desired: 1, running: 0 },
            });
            await worker.runAutoHeal();
            expect(mockOrchestrator.restart).toHaveBeenCalledWith('srv-broken');
            expect(mockInstanceRepo.update).toHaveBeenCalledWith('inst-broken', expect.objectContaining({
                status: 'starting',
                healCount: 3,
            }));
            expect(mockHealLogRepo.save).toHaveBeenCalled();
            expect(mockRealtimeService.emitCircuitBreakerAlert).toHaveBeenCalledWith('tenant-default', 'acc-broken', 'srv-broken', expect.stringContaining('AUTO_HEALED'));
        });
    });
});
//# sourceMappingURL=auto-heal.worker.spec.js.map