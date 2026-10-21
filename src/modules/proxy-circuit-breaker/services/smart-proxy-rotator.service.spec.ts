// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/proxy-circuit-breaker/services/smart-proxy-rotator.service.spec.ts
//  Test Suite for PILLAR 4: Subnet-Isolated Dynamic Proxy Rotation
// ─────────────────────────────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SmartProxyRotatorService } from './smart-proxy-rotator.service';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';

describe('SmartProxyRotatorService', () => {
  let service: SmartProxyRotatorService;
  let mockProxyRepo: any;

  beforeEach(async () => {
    mockProxyRepo = {
      findOneBy: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartProxyRotatorService,
        {
          provide: getRepositoryToken(ProxyPoolEntity),
          useValue: mockProxyRepo,
        },
      ],
    }).compile();

    service = module.get<SmartProxyRotatorService>(SmartProxyRotatorService);
  });

  describe('Subnet-Isolated Proxy Rotation', () => {
    it('should trip failed proxy and assign clean candidate from independent subnet', async () => {
      const failedProxy: Partial<ProxyPoolEntity> = {
        id: 'proxy-failed-1',
        host: '185.220.101.45',
        port: 8080,
        isActive: true,
        isHealthy: true,
      };

      const cleanCandidate: Partial<ProxyPoolEntity> = {
        id: 'proxy-clean-2',
        host: '104.244.75.12', // Completely different subnet
        port: 3128,
        isActive: true,
        isHealthy: true,
      };

      mockProxyRepo.findOneBy.mockResolvedValue(failedProxy);

      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([cleanCandidate]),
      };
      mockProxyRepo.createQueryBuilder.mockReturnValue(mockQb);

      const accountId = 'acc-target-123';
      const result = await service.rotateToCleanSubnet(accountId, 'proxy-failed-1');

      // Verify failed proxy was marked unhealthy
      expect(failedProxy.isHealthy).toBe(false);
      expect(mockProxyRepo.save).toHaveBeenCalledWith(failedProxy);

      // Verify subnet exclusion query was constructed for 185.220.%
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'p.host NOT LIKE :subnet',
        { subnet: '185.220%' }
      );

      // Verify clean candidate was assigned to account
      expect(result.id).toBe('proxy-clean-2');
      expect(result.assignedAccountId).toBe(accountId);
      expect(mockProxyRepo.save).toHaveBeenCalledWith(cleanCandidate);
    });

    it('should gracefully fallback to broader healthy pool if isolated subnet candidates are depleted', async () => {
      const failedProxy: Partial<ProxyPoolEntity> = {
        id: 'proxy-failed-single-pool',
        host: '192.168.1.10',
        port: 8080,
        isActive: true,
        isHealthy: true,
      };

      const fallbackProxy: Partial<ProxyPoolEntity> = {
        id: 'proxy-fallback',
        host: '192.168.1.99',
        port: 8080,
        isActive: true,
        isHealthy: true,
      };

      mockProxyRepo.findOneBy.mockResolvedValue(failedProxy);

      // QueryBuilder returns empty (no proxies outside 192.168.%)
      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockProxyRepo.createQueryBuilder.mockReturnValue(mockQb);

      // Fallback search returns remaining healthy proxy
      mockProxyRepo.find.mockResolvedValue([fallbackProxy]);

      const result = await service.rotateToCleanSubnet('acc-fallback', 'proxy-failed-single-pool');

      expect(result.id).toBe('proxy-fallback');
      expect(result.assignedAccountId).toBe('acc-fallback');
    });

    it('should throw error when proxy pool is completely exhausted', async () => {
      mockProxyRepo.findOneBy.mockResolvedValue(null);

      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockProxyRepo.createQueryBuilder.mockReturnValue(mockQb);
      mockProxyRepo.find.mockResolvedValue([]);

      await expect(
        service.rotateToCleanSubnet('acc-exhausted', 'proxy-none')
      ).rejects.toThrow('Critical: Proxy pool exhausted across all subnets.');
    });
  });
});
