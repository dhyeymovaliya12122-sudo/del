import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { ProxyCircuitBreakerEntity, CircuitState } from '../entities/proxy-circuit-breaker.entity';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';
import { SmartProxyRotatorService } from './smart-proxy-rotator.service';
export declare class ProxyCircuitBreakerService {
    private readonly cbRepo;
    private readonly proxyRepo;
    private readonly redis;
    private readonly healthQueue;
    private readonly config;
    private readonly proxyRotator?;
    private readonly logger;
    private key;
    private readonly prefix;
    private readonly threshold;
    private readonly resetMs;
    private readonly halfOpenMax;
    constructor(cbRepo: Repository<ProxyCircuitBreakerEntity>, proxyRepo: Repository<ProxyPoolEntity>, redis: Redis, healthQueue: Queue, config: ConfigService, proxyRotator?: SmartProxyRotatorService);
    getState(proxyId: string): Promise<CircuitState>;
    recordFailure(proxyId: string, accountId?: string): Promise<void>;
    recordSuccess(proxyId: string): Promise<void>;
    openCircuit(proxyId: string, accountId?: string): Promise<void>;
    halfOpenCircuit(proxyId: string, accountId?: string): Promise<void>;
    closeCircuit(proxyId: string, accountId?: string): Promise<void>;
    private pauseAccountQueue;
    private resumeAccountQueue;
    private upsertCbState;
    getAllCircuitStates(): Promise<Array<{
        proxyId: string;
        state: CircuitState;
        failures: number;
    }>>;
}
