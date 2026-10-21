import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProxyPoolEntity } from '../entities/proxy-pool.entity';
export declare class ProxyHealthService {
    private readonly proxyRepo;
    private readonly config;
    private readonly logger;
    constructor(proxyRepo: Repository<ProxyPoolEntity>, config: ConfigService);
    runHealthChecks(): Promise<void>;
    checkProxy(proxy: ProxyPoolEntity): Promise<boolean>;
}
