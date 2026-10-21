import { OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
export interface ClusterStatus {
    accountId: string;
    isLeader: boolean;
    leaderId: string | null;
    myInstanceId: string;
    ttlSeconds: number;
    mode: 'distributed-cluster' | 'standalone-no-redis';
}
export declare class DistributedSocketManagerService implements OnModuleDestroy {
    private readonly redis?;
    private readonly logger;
    private heartbeatInterval?;
    private readonly heartbeatIntervals;
    private readonly standdownCallbacks;
    private readonly instanceId;
    constructor(redis?: Redis);
    getInstanceId(): string;
    acquireSocketLease(accountId: string, instanceId?: string): Promise<boolean>;
    private startHeartbeat;
    releaseSocketLease(accountId: string, instanceId?: string): Promise<boolean>;
    getCurrentLeaseOwner(accountId: string): Promise<string | null>;
    isLeaseHeldByMe(accountId: string, instanceId?: string): Promise<boolean>;
    getClusterStatus(accountId: string, instanceId?: string): Promise<ClusterStatus>;
    registerStanddownHandler(accountId: string, handler: () => void | Promise<void>): void;
    unregisterStanddownHandler(accountId: string): void;
    onModuleDestroy(): void;
}
