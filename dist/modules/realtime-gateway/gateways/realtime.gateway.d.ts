import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisAdapterFactory } from '../factories/redis-adapter.factory';
export declare class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly redisAdapterFactory;
    private readonly jwtService;
    private readonly configService;
    server: Server;
    private readonly logger;
    constructor(redisAdapterFactory: RedisAdapterFactory, jwtService: JwtService, configService: ConfigService);
    afterInit(server: Server): Promise<void>;
    onModuleDestroy(): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribe(data: {
        tenantId: string;
        accountId: string;
        channel?: string;
    }, client: Socket): void;
    emitToAccount(tenantId: string, accountId: string, event: string, payload: unknown): void;
    emitToTenant(tenantId: string, event: string, payload: unknown): void;
}
