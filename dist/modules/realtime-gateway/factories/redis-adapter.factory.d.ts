import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class RedisAdapterFactory implements OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private pubClient;
    private subClient;
    constructor(config: ConfigService);
    createAdapter(): Promise<(nsp: any) => import("@socket.io/redis-adapter").RedisAdapter>;
    disconnect(): void;
    onModuleDestroy(): void;
}
