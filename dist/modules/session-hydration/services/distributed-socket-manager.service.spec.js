"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const distributed_socket_manager_service_1 = require("./distributed-socket-manager.service");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
const RedisMock = require('ioredis-mock');
describe('DistributedSocketManagerService', () => {
    let service;
    let redisMock;
    beforeEach(async () => {
        jest.useFakeTimers();
        redisMock = new RedisMock();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                distributed_socket_manager_service_1.DistributedSocketManagerService,
                {
                    provide: cache_module_1.REDIS_CLIENT,
                    useValue: redisMock,
                },
            ],
        }).compile();
        service = module.get(distributed_socket_manager_service_1.DistributedSocketManagerService);
    });
    afterEach(() => {
        service.onModuleDestroy();
        jest.clearAllTimers();
        jest.useRealTimers();
    });
    describe('Leader Election & Lease Acquisition', () => {
        it('should acquire lease when socket lock is vacant', async () => {
            const accountId = 'acc-test-1';
            const myId = service.getInstanceId();
            const acquired = await service.acquireSocketLease(accountId);
            expect(acquired).toBe(true);
            const owner = await service.getCurrentLeaseOwner(accountId);
            expect(owner).toBe(myId);
            const isMe = await service.isLeaseHeldByMe(accountId);
            expect(isMe).toBe(true);
        });
        it('should deny lease when another replica node holds the lock', async () => {
            const accountId = 'acc-test-collision';
            const rivalNode = 'k8s-pod-standby-99';
            await redisMock.set(`wa:socket:lease:${accountId}`, rivalNode, 'EX', 15);
            const acquired = await service.acquireSocketLease(accountId);
            expect(acquired).toBe(false);
            const owner = await service.getCurrentLeaseOwner(accountId);
            expect(owner).toBe(rivalNode);
            const isMe = await service.isLeaseHeldByMe(accountId);
            expect(isMe).toBe(false);
        });
        it('should allow idempotent re-acquisition if this node already owns the lease', async () => {
            const accountId = 'acc-test-idempotent';
            const myId = service.getInstanceId();
            const firstAcquire = await service.acquireSocketLease(accountId);
            expect(firstAcquire).toBe(true);
            const secondAcquire = await service.acquireSocketLease(accountId);
            expect(secondAcquire).toBe(true);
            const owner = await service.getCurrentLeaseOwner(accountId);
            expect(owner).toBe(myId);
        });
    });
    describe('Heartbeat Renewal & Stand-down Failover', () => {
        it('should periodically renew TTL via heartbeat', async () => {
            const accountId = 'acc-test-heartbeat';
            await service.acquireSocketLease(accountId);
            await jest.advanceTimersByTimeAsync(5000);
            const status = await service.getClusterStatus(accountId);
            expect(status.isLeader).toBe(true);
            expect(status.leaderId).toBe(service.getInstanceId());
            expect(status.ttlSeconds).toBeGreaterThan(0);
        });
        it('should invoke stand-down callback if lease is lost to another node', async () => {
            const accountId = 'acc-test-standdown';
            await service.acquireSocketLease(accountId);
            const standdownMock = jest.fn();
            service.registerStanddownHandler(accountId, standdownMock);
            await redisMock.set(`wa:socket:lease:${accountId}`, 'other-k8s-pod', 'EX', 15);
            await jest.advanceTimersByTimeAsync(5000);
            expect(standdownMock).toHaveBeenCalledTimes(1);
        });
    });
    describe('Atomic Lease Release', () => {
        it('should safely release lease owned by this node', async () => {
            const accountId = 'acc-test-release';
            await service.acquireSocketLease(accountId);
            const released = await service.releaseSocketLease(accountId);
            expect(released).toBe(true);
            const owner = await service.getCurrentLeaseOwner(accountId);
            expect(owner).toBeNull();
        });
        it('should refuse to release lease owned by a different node', async () => {
            const accountId = 'acc-test-other';
            await redisMock.set(`wa:socket:lease:${accountId}`, 'foreign-node-xyz', 'EX', 15);
            const released = await service.releaseSocketLease(accountId);
            expect(released).toBe(false);
            const owner = await service.getCurrentLeaseOwner(accountId);
            expect(owner).toBe('foreign-node-xyz');
        });
    });
    describe('Cluster Status Telemetry', () => {
        it('should return accurate cluster status structure', async () => {
            const accountId = 'acc-telemetry-1';
            await service.acquireSocketLease(accountId);
            const status = await service.getClusterStatus(accountId);
            expect(status).toMatchObject({
                accountId,
                isLeader: true,
                leaderId: service.getInstanceId(),
                myInstanceId: service.getInstanceId(),
                mode: 'distributed-cluster',
            });
            expect(status.ttlSeconds).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=distributed-socket-manager.service.spec.js.map