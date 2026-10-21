import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export declare class ProxyCircuitBreakerEntity {
    id: string;
    proxyId: string;
    proxy: ProxyPoolEntity;
    accountId?: string;
    state: CircuitState;
    failureCount: number;
    lastFailureAt?: Date;
    openedAt?: Date;
    resetAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
