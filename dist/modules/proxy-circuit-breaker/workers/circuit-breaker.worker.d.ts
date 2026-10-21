import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';
import { ProxyCircuitBreakerService } from '../services/proxy-circuit-breaker.service';
export declare class CircuitBreakerWorker extends WorkerHost {
    private readonly proxyRepo;
    private readonly circuitBreakerService;
    private readonly logger;
    constructor(proxyRepo: Repository<ProxyPoolEntity>, circuitBreakerService: ProxyCircuitBreakerService);
    process(job: Job): Promise<void>;
    private handleHealthProbe;
    private handleCircuitReset;
}
