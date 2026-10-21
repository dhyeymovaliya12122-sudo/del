// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/orchestration/workers/auto-heal.worker.spec.ts
//  Test Suite for PILLAR 4: Autonomous Self-Healing Swarm Worker
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../../realtime-gateway/services/realtime-event.service', () => ({
  RealtimeEventService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AutoHealWorker } from './auto-heal.worker';
import { ContainerInstanceEntity } from '../entities/container-instance.entity';
import { ContainerHealLogEntity } from '../entities/container-heal-log.entity';
import { CONTAINER_ORCHESTRATOR_TOKEN } from '../interfaces/container-orchestrator.interface';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
import { RealtimeEventService } from '../../realtime-gateway/services/realtime-event.service';

describe('AutoHealWorker (Autonomous Self-Healing Swarm)', () => {
  let worker: AutoHealWorker;
  let mockInstanceRepo: any;
  let mockHealLogRepo: any;
  let mockOrchestrator: any;
  let mockRealtimeService: any;
  let mockRedis: any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoHealWorker,
        {
          provide: getRepositoryToken(ContainerInstanceEntity),
          useValue: mockInstanceRepo,
        },
        {
          provide: getRepositoryToken(ContainerHealLogEntity),
          useValue: mockHealLogRepo,
        },
        {
          provide: CONTAINER_ORCHESTRATOR_TOKEN,
          useValue: mockOrchestrator,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
        {
          provide: RealtimeEventService,
          useValue: mockRealtimeService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: any) => def),
          },
        },
      ],
    }).compile();

    worker = module.get<AutoHealWorker>(AutoHealWorker);
  });

  describe('runAutoHeal', () => {
    it('should skip healing when instances are healthy and running', async () => {
      const healthyInstance: Partial<ContainerInstanceEntity> = {
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
      const brokenInstance: Partial<ContainerInstanceEntity> = {
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

      // Verify restart command was issued to orchestrator
      expect(mockOrchestrator.restart).toHaveBeenCalledWith('srv-broken');

      // Verify heal count was incremented
      expect(mockInstanceRepo.update).toHaveBeenCalledWith('inst-broken', expect.objectContaining({
        status: 'starting',
        healCount: 3,
      }));

      // Verify audit log and realtime notification emitted
      expect(mockHealLogRepo.save).toHaveBeenCalled();
      expect(mockRealtimeService.emitCircuitBreakerAlert).toHaveBeenCalledWith(
        'tenant-default',
        'acc-broken',
        'srv-broken',
        expect.stringContaining('AUTO_HEALED')
      );
    });
  });
});
