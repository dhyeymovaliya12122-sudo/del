// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/session-hydration/services/distributed-socket-manager.service.spec.ts
//  Test Suite for PILLAR 2: Distributed Active-Active Socket Clustering
// ─────────────────────────────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { DistributedSocketManagerService } from './distributed-socket-manager.service';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';
const RedisMock = require('ioredis-mock');

describe('DistributedSocketManagerService', () => {
  let service: DistributedSocketManagerService;
  let redisMock: any;

  beforeEach(async () => {
    jest.useFakeTimers();
    redisMock = new RedisMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedSocketManagerService,
        {
          provide: REDIS_CLIENT,
          useValue: redisMock,
        },
      ],
    }).compile();

    service = module.get<DistributedSocketManagerService>(DistributedSocketManagerService);
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

      // Pre-lock with rival node
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

      // Re-acquiring from same node
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

      // Advance timers by 5 seconds (heartbeat interval)
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

      // Simulate split-brain / another node forcefully acquiring lock
      await redisMock.set(`wa:socket:lease:${accountId}`, 'other-k8s-pod', 'EX', 15);

      // Advance timer to trigger next heartbeat check
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

      // Attempt to release using current node's identity
      const released = await service.releaseSocketLease(accountId);
      expect(released).toBe(false);

      // Key must still exist and be owned by foreign node
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
