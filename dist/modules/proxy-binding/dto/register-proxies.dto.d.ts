export declare class ProxyItemDto {
    label: string;
    protocol: 'socks5' | 'http' | 'https';
    host: string;
    port: number;
    username?: string;
    password?: string;
}
export declare class RegisterProxiesDto {
    proxies: ProxyItemDto[];
}
