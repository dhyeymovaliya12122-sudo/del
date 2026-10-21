import { Repository } from 'typeorm';
import { ProxyPoolEntity } from '../entities/proxy-pool.entity';
export declare class ProxyRotationService {
    private readonly proxyRepo;
    private readonly logger;
    constructor(proxyRepo: Repository<ProxyPoolEntity>);
    rotateForAccount(accountId: string): Promise<ProxyPoolEntity>;
}
