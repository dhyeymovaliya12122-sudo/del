import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
export declare class PubSubListenerService implements OnModuleInit, OnModuleDestroy {
    private readonly redis;
    private readonly config;
    private readonly logger;
    private subscriber;
    constructor(redis: Redis, config: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private handleMessage;
    publish(channel: string, payload: object): Promise<void>;
}
