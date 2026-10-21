import { ProxyBindingService } from '../services/proxy-binding.service';
import { ProxyRotationService } from '../services/proxy-rotation.service';
import { ProxyHealthService } from '../services/proxy-health.service';
import { RegisterProxiesDto } from '../dto/register-proxies.dto';
export declare class ProxyBindingController {
    private readonly proxyBindingService;
    private readonly proxyRotationService;
    private readonly proxyHealthService;
    constructor(proxyBindingService: ProxyBindingService, proxyRotationService: ProxyRotationService, proxyHealthService: ProxyHealthService);
    registerProxies(dto: RegisterProxiesDto): Promise<import("../entities/proxy-pool.entity").ProxyPoolEntity[]>;
    getAccountProxy(accountId: string): Promise<import("../entities/proxy-pool.entity").ProxyPoolEntity>;
    rotateProxy(accountId: string): Promise<import("../entities/proxy-pool.entity").ProxyPoolEntity>;
    releaseProxy(accountId: string): Promise<void>;
}
