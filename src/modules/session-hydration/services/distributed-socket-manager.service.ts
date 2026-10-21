// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/session-hydration/services/distributed-socket-manager.service.ts
//  PILLAR 2: ⚡ Distributed Active-Active Socket Clustering & Multi-Node Leader Election
//
//  Features:
//    - Redlock lease acquisition with 15s TTL (SET ... EX 15 NX)
//    - Automatic 5s heartbeat renewal using atomic Lua script
//    - Safe atomic release using Lua verification
//    - Node failover detection & local socket stand-down callback
//    - Multi-tenant / multi-account cluster support with per-account leases
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import * as os from 'os';
import * as crypto from 'crypto';
import { REDIS_CLIENT } from '../../../infrastructure/cache/cache.module';

export interface ClusterStatus {
  accountId: string;
  isLeader: boolean;
  leaderId: string | null;
  myInstanceId: string;
  ttlSeconds: number;
  mode: 'distributed-cluster' | 'standalone-no-redis';
}

@Injectable()
export class DistributedSocketManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedSocketManagerService.name);
  
  // Backward-compatible single interval property as requested
  private heartbeatInterval?: NodeJS.Timeout;
  
  // Multi-account interval map to support multiple WhatsApp accounts on a single node
  private readonly heartbeatIntervals = new Map<string, NodeJS.Timeout>();
  
  // Registered stand-down callbacks when another node takes over or lease expires
  private readonly standdownCallbacks = new Map<string, () => void | Promise<void>>();

  // Unique identifier for this pod/container instance
  private readonly instanceId: string;

  constructor(
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redis?: Redis,
  ) {
    this.instanceId =
      process.env.POD_NAME ||
      process.env.HOSTNAME ||
      `${os.hostname()}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
    this.logger.log(`⚡ [Cluster] DistributedSocketManager initialized on node: ${this.instanceId}`);
  }

  /**
   * Returns this node's unique cluster instance identifier.
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Acquires exclusive lease to run a WhatsApp account socket.
   * Uses atomic Redis SET ... EX 15 NX.
   * If lease is already held by this node, re-arms heartbeat and grants access.
   */
  async acquireSocketLease(accountId: string, instanceId: string = this.instanceId): Promise<boolean> {
    const lockKey = `wa:socket:lease:${accountId}`;

    if (!this.redis) {
      this.logger.warn(`⚠️ [Cluster] Redis client unavailable; granting standalone local lease for ${accountId}`);
      return true;
    }

    try {
      // Atomic SET if Not Exists with 15-second TTL
      const acquired = await this.redis.set(lockKey, instanceId, 'EX', 15, 'NX');

      if (acquired === 'OK') {
        this.startHeartbeat(lockKey, instanceId, accountId);
        this.logger.log(`✅ [Cluster] Acquired exclusive socket lease for ${accountId} on node ${instanceId}`);
        return true;
      }

      // Check if this node already holds the lease (e.g. reconnect or warm restart)
      const currentOwner = await this.redis.get(lockKey);
      if (currentOwner === instanceId) {
        this.startHeartbeat(lockKey, instanceId, accountId);
        this.logger.log(`🔄 [Cluster] Lease already held by current node ${instanceId} for ${accountId}, re-armed heartbeat`);
        return true;
      }

      this.logger.warn(
        `🔒 [Cluster] Node [${instanceId}] denied socket lease for ${accountId}. Currently held by [${currentOwner}]`
      );
      return false;
    } catch (err: any) {
      this.logger.error(`❌ [Cluster] Error during lease acquisition for ${accountId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Starts a dynamic heartbeat loop renewing the 15-second lease every 5 seconds.
   * Only refreshes TTL if this node still owns the key in Redis.
   */
  private startHeartbeat(lockKey: string, instanceId: string, accountId?: string): void {
    // Clear any previous interval for this specific key
    const prevInterval = this.heartbeatIntervals.get(lockKey);
    if (prevInterval) {
      clearInterval(prevInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    const interval = setInterval(async () => {
      if (!this.redis) return;

      // Refresh TTL only if we still own the key
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], 15)
        else
          return 0
        end
      `;

      try {
        const refreshed = await this.redis.eval(luaScript, 1, lockKey, instanceId);
        if (!refreshed || refreshed === 0) {
          this.logger.warn(`⚠️ [Cluster] Lost lease for ${lockKey}. Standing down socket.`);
          clearInterval(interval);
          this.heartbeatIntervals.delete(lockKey);
          if (this.heartbeatInterval === interval) {
            this.heartbeatInterval = undefined;
          }

          // Trigger local standdown hook if registered
          if (accountId && this.standdownCallbacks.has(accountId)) {
            try {
              const handler = this.standdownCallbacks.get(accountId)!;
              await handler();
            } catch (standdownErr: any) {
              this.logger.error(`Error during standdown callback for ${accountId}: ${standdownErr.message}`);
            }
          }
        }
      } catch (err: any) {
        this.logger.error(`⚠️ [Cluster] Heartbeat refresh error for ${lockKey}: ${err.message}`);
      }
    }, 5000);

    this.heartbeatInterval = interval;
    this.heartbeatIntervals.set(lockKey, interval);
  }

  /**
   * Atomically releases exclusive socket lease for an account.
   * Validates ownership via Lua script before deleting key.
   */
  async releaseSocketLease(accountId: string, instanceId: string = this.instanceId): Promise<boolean> {
    const lockKey = `wa:socket:lease:${accountId}`;

    // Cancel heartbeat
    const interval = this.heartbeatIntervals.get(lockKey);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(lockKey);
    }
    if (this.heartbeatInterval === interval) {
      this.heartbeatInterval = undefined;
    }

    if (!this.redis) return true;

    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const released = await this.redis.eval(luaScript, 1, lockKey, instanceId);
      this.logger.log(`🔓 [Cluster] Released socket lease for ${accountId} on node ${instanceId} (result: ${released})`);
      return released === 1;
    } catch (err: any) {
      this.logger.error(`❌ [Cluster] Failed to release socket lease for ${accountId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Queries Redis for current lease owner.
   */
  async getCurrentLeaseOwner(accountId: string): Promise<string | null> {
    if (!this.redis) return null;
    const lockKey = `wa:socket:lease:${accountId}`;
    try {
      return await this.redis.get(lockKey);
    } catch {
      return null;
    }
  }

  /**
   * Checks whether this node currently holds the lease.
   */
  async isLeaseHeldByMe(accountId: string, instanceId: string = this.instanceId): Promise<boolean> {
    const owner = await this.getCurrentLeaseOwner(accountId);
    return owner === instanceId;
  }

  /**
   * Returns comprehensive cluster state for an account.
   */
  async getClusterStatus(accountId: string, instanceId: string = this.instanceId): Promise<ClusterStatus> {
    if (!this.redis) {
      return {
        accountId,
        isLeader: true,
        leaderId: instanceId,
        myInstanceId: instanceId,
        ttlSeconds: -1,
        mode: 'standalone-no-redis',
      };
    }

    const lockKey = `wa:socket:lease:${accountId}`;
    try {
      const [owner, ttl] = await Promise.all([
        this.redis.get(lockKey),
        this.redis.ttl(lockKey),
      ]);

      return {
        accountId,
        isLeader: owner === instanceId,
        leaderId: owner,
        myInstanceId: instanceId,
        ttlSeconds: ttl,
        mode: 'distributed-cluster',
      };
    } catch (err: any) {
      return {
        accountId,
        isLeader: false,
        leaderId: null,
        myInstanceId: instanceId,
        ttlSeconds: -1,
        mode: 'distributed-cluster',
      };
    }
  }

  /**
   * Registers a stand-down hook called when this node loses lease.
   */
  registerStanddownHandler(accountId: string, handler: () => void | Promise<void>): void {
    this.standdownCallbacks.set(accountId, handler);
  }

  /**
   * Unregisters a stand-down hook.
   */
  unregisterStanddownHandler(accountId: string): void {
    this.standdownCallbacks.delete(accountId);
  }

  /**
   * Cleans up all heartbeat timers on module destruction.
   */
  onModuleDestroy() {
    this.logger.log(`🛑 [Cluster] Terminating DistributedSocketManager heartbeat timers...`);
    for (const [key, interval] of this.heartbeatIntervals.entries()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    this.standdownCallbacks.clear();
  }
}
