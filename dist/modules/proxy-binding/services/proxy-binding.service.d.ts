import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { ProxyPoolEntity, ProxyProtocol } from '../entities/proxy-pool.entity';
export interface ProxyAgentBundle {
    httpsAgent: SocksProxyAgent | HttpsProxyAgent<string>;
    httpAgent: SocksProxyAgent | HttpProxyAgent<string>;
    proxyUrl: string;
    protocol: ProxyProtocol;
}
export declare class ProxyBindingService {
    private readonly proxyRepo;
    private readonly config;
    private readonly logger;
    constructor(proxyRepo: Repository<ProxyPoolEntity>, config: ConfigService);
    assignProxyToAccount(accountId: string): Promise<ProxyPoolEntity>;
    buildAgentBundle(accountId: string): Promise<ProxyAgentBundle>;
    releaseProxy(accountId: string): Promise<void>;
    registerProxies(proxies: Partial<ProxyPoolEntity>[]): Promise<ProxyPoolEntity[]>;
}
