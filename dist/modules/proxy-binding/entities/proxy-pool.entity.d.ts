export type ProxyProtocol = 'socks5' | 'http' | 'https';
export declare class ProxyPoolEntity {
    id: string;
    label: string;
    protocol: ProxyProtocol;
    host: string;
    port: number;
    username?: string;
    password?: string;
    isActive: boolean;
    isHealthy: boolean;
    lastHealthCheck?: Date;
    assignedAccountId?: string;
    createdAt: Date;
    updatedAt: Date;
    toUrl(): string;
}
