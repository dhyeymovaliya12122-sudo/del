import { Repository } from 'typeorm';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';
import { TelemetryService } from '../../telemetry/services/telemetry.service';
export declare class SmartProxyRotatorService {
    private readonly proxyRepo;
    private readonly telemetryService?;
    private readonly logger;
    constructor(proxyRepo: Repository<ProxyPoolEntity>, telemetryService?: TelemetryService);
    warmPingProxy(proxy: ProxyPoolEntity, timeoutMs?: number): Promise<{
        reachable: boolean;
        latencyMs: number;
    }>;
    rotateToCleanSubnet(accountId: string, failedProxyId?: string): Promise<ProxyPoolEntity>;
}
