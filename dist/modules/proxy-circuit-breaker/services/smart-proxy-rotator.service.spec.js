"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const smart_proxy_rotator_service_1 = require("./smart-proxy-rotator.service");
const proxy_pool_entity_1 = require("../../proxy-binding/entities/proxy-pool.entity");
describe('SmartProxyRotatorService', () => {
    let service;
    let mockProxyRepo;
    beforeEach(async () => {
        mockProxyRepo = {
            findOneBy: jest.fn(),
            save: jest.fn((entity) => Promise.resolve(entity)),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                smart_proxy_rotator_service_1.SmartProxyRotatorService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(proxy_pool_entity_1.ProxyPoolEntity),
                    useValue: mockProxyRepo,
                },
            ],
        }).compile();
        service = module.get(smart_proxy_rotator_service_1.SmartProxyRotatorService);
    });
    describe('Subnet-Isolated Proxy Rotation', () => {
        it('should trip failed proxy and assign clean candidate from independent subnet', async () => {
            const failedProxy = {
                id: 'proxy-failed-1',
                host: '185.220.101.45',
                port: 8080,
                isActive: true,
                isHealthy: true,
            };
            const cleanCandidate = {
                id: 'proxy-clean-2',
                host: '104.244.75.12',
                port: 3128,
                isActive: true,
                isHealthy: true,
            };
            mockProxyRepo.findOneBy.mockResolvedValue(failedProxy);
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([cleanCandidate]),
            };
            mockProxyRepo.createQueryBuilder.mockReturnValue(mockQb);
            const accountId = 'acc-target-123';
            const result = await service.rotateToCleanSubnet(accountId, 'proxy-failed-1');
            expect(failedProxy.isHealthy).toBe(false);
            expect(mockProxyRepo.save).toHaveBeenCalledWith(failedProxy);
            expect(mockQb.andWhere).toHaveBeenCalledWith('p.host NOT LIKE :subnet', { subnet: '185.220%' });
            expect(result.id).toBe('proxy-clean-2');
            expect(result.assignedAccountId).toBe(accountId);
            expect(mockProxyRepo.save).toHaveBeenCalledWith(cleanCandidate);
        });
        it('should gracefully fallback to broader healthy pool if isolated subnet candidates are depleted', async () => {
            const failedProxy = {
                id: 'proxy-failed-single-pool',
                host: '192.168.1.10',
                port: 8080,
                isActive: true,
                isHealthy: true,
            };
            const fallbackProxy = {
                id: 'proxy-fallback',
                host: '192.168.1.99',
                port: 8080,
                isActive: true,
                isHealthy: true,
            };
            mockProxyRepo.findOneBy.mockResolvedValue(failedProxy);
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };
            mockProxyRepo.createQueryBuilder.mockReturnValue(mockQb);
            mockProxyRepo.find.mockResolvedValue([fallbackProxy]);
            const result = await service.rotateToCleanSubnet('acc-fallback', 'proxy-failed-single-pool');
            expect(result.id).toBe('proxy-fallback');
            expect(result.assignedAccountId).toBe('acc-fallback');
        });
        it('should throw error when proxy pool is completely exhausted', async () => {
            mockProxyRepo.findOneBy.mockResolvedValue(null);
            const mockQb = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };
            mockProxyRepo.createQueryBuilder.mockReturnValue(mockQb);
            mockProxyRepo.find.mockResolvedValue([]);
            await expect(service.rotateToCleanSubnet('acc-exhausted', 'proxy-none')).rejects.toThrow('Critical: Proxy pool exhausted across all subnets.');
        });
    });
});
//# sourceMappingURL=smart-proxy-rotator.service.spec.js.map