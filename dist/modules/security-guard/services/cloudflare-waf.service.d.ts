import { ConfigService } from '@nestjs/config';
export declare class CloudflareWafService {
    private readonly config;
    private readonly logger;
    private readonly baseUrl;
    private readonly headers;
    private readonly zoneId;
    constructor(config: ConfigService);
    blockIp(ip: string, notes?: string): Promise<void>;
    getFirewallRules(): Promise<any[]>;
}
