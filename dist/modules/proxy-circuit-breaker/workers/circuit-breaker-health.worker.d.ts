import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';
export declare class CircuitBreakerHealthWorker {
    private readonly proxyRepo;
    private readonly healthQueue;
    private readonly logger;
    constructor(proxyRepo: Repository<ProxyPoolEntity>, healthQueue: Queue);
    scheduleHealthProbes(): Promise<void>;
}
