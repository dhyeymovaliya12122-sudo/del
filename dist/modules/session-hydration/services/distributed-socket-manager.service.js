"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DistributedSocketManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedSocketManagerService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const os = require("os");
const crypto = require("crypto");
const cache_module_1 = require("../../../infrastructure/cache/cache.module");
let DistributedSocketManagerService = DistributedSocketManagerService_1 = class DistributedSocketManagerService {
    constructor(redis) {
        this.redis = redis;
        this.logger = new common_1.Logger(DistributedSocketManagerService_1.name);
        this.heartbeatIntervals = new Map();
        this.standdownCallbacks = new Map();
        this.instanceId =
            process.env.POD_NAME ||
                process.env.HOSTNAME ||
                `${os.hostname()}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
        this.logger.log(`⚡ [Cluster] DistributedSocketManager initialized on node: ${this.instanceId}`);
    }
    getInstanceId() {
        return this.instanceId;
    }
    async acquireSocketLease(accountId, instanceId = this.instanceId) {
        const lockKey = `wa:socket:lease:${accountId}`;
        if (!this.redis) {
            this.logger.warn(`⚠️ [Cluster] Redis client unavailable; granting standalone local lease for ${accountId}`);
            return true;
        }
        try {
            const acquired = await this.redis.set(lockKey, instanceId, 'EX', 15, 'NX');
            if (acquired === 'OK') {
                this.startHeartbeat(lockKey, instanceId, accountId);
                this.logger.log(`✅ [Cluster] Acquired exclusive socket lease for ${accountId} on node ${instanceId}`);
                return true;
            }
            const currentOwner = await this.redis.get(lockKey);
            if (currentOwner === instanceId) {
                this.startHeartbeat(lockKey, instanceId, accountId);
                this.logger.log(`🔄 [Cluster] Lease already held by current node ${instanceId} for ${accountId}, re-armed heartbeat`);
                return true;
            }
            this.logger.warn(`🔒 [Cluster] Node [${instanceId}] denied socket lease for ${accountId}. Currently held by [${currentOwner}]`);
            return false;
        }
        catch (err) {
            this.logger.error(`❌ [Cluster] Error during lease acquisition for ${accountId}: ${err.message}`);
            return false;
        }
    }
    startHeartbeat(lockKey, instanceId, accountId) {
        const prevInterval = this.heartbeatIntervals.get(lockKey);
        if (prevInterval) {
            clearInterval(prevInterval);
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        const interval = setInterval(async () => {
            if (!this.redis)
                return;
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
                    if (accountId && this.standdownCallbacks.has(accountId)) {
                        try {
                            const handler = this.standdownCallbacks.get(accountId);
                            await handler();
                        }
                        catch (standdownErr) {
                            this.logger.error(`Error during standdown callback for ${accountId}: ${standdownErr.message}`);
                        }
                    }
                }
            }
            catch (err) {
                this.logger.error(`⚠️ [Cluster] Heartbeat refresh error for ${lockKey}: ${err.message}`);
            }
        }, 5000);
        this.heartbeatInterval = interval;
        this.heartbeatIntervals.set(lockKey, interval);
    }
    async releaseSocketLease(accountId, instanceId = this.instanceId) {
        const lockKey = `wa:socket:lease:${accountId}`;
        const interval = this.heartbeatIntervals.get(lockKey);
        if (interval) {
            clearInterval(interval);
            this.heartbeatIntervals.delete(lockKey);
        }
        if (this.heartbeatInterval === interval) {
            this.heartbeatInterval = undefined;
        }
        if (!this.redis)
            return true;
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
        }
        catch (err) {
            this.logger.error(`❌ [Cluster] Failed to release socket lease for ${accountId}: ${err.message}`);
            return false;
        }
    }
    async getCurrentLeaseOwner(accountId) {
        if (!this.redis)
            return null;
        const lockKey = `wa:socket:lease:${accountId}`;
        try {
            return await this.redis.get(lockKey);
        }
        catch {
            return null;
        }
    }
    async isLeaseHeldByMe(accountId, instanceId = this.instanceId) {
        const owner = await this.getCurrentLeaseOwner(accountId);
        return owner === instanceId;
    }
    async getClusterStatus(accountId, instanceId = this.instanceId) {
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
        }
        catch (err) {
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
    registerStanddownHandler(accountId, handler) {
        this.standdownCallbacks.set(accountId, handler);
    }
    unregisterStanddownHandler(accountId) {
        this.standdownCallbacks.delete(accountId);
    }
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
};
exports.DistributedSocketManagerService = DistributedSocketManagerService;
exports.DistributedSocketManagerService = DistributedSocketManagerService = DistributedSocketManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(cache_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [ioredis_1.default])
], DistributedSocketManagerService);
//# sourceMappingURL=distributed-socket-manager.service.js.map