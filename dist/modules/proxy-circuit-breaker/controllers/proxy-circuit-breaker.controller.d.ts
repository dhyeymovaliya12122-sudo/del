import { ProxyCircuitBreakerService } from '../services/proxy-circuit-breaker.service';
import { SmartProxyRotatorService } from '../services/smart-proxy-rotator.service';
export declare class ProxyCircuitBreakerController {
    private readonly cbService;
    private readonly proxyRotator;
    constructor(cbService: ProxyCircuitBreakerService, proxyRotator: SmartProxyRotatorService);
    getAllStates(): Promise<{
        proxyId: string;
        state: import("../entities/proxy-circuit-breaker.entity").CircuitState;
        failures: number;
    }[]>;
    getState(proxyId: string): Promise<{
        proxyId: string;
        state: import("../entities/proxy-circuit-breaker.entity").CircuitState;
    }>;
    resetCircuit(proxyId: string): Promise<{
        message: string;
    }>;
    tripCircuit(proxyId: string): Promise<{
        message: string;
    }>;
    rotateProxy(accountId: string, failedProxyId?: string): Promise<{
        message: string;
        proxy: {
            id: string;
            host: string;
            port: number;
            protocol: import("../../proxy-binding/entities/proxy-pool.entity").ProxyProtocol;
        };
    }>;
}
