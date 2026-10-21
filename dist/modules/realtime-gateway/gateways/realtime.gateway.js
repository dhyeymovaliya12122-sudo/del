"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RealtimeGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const redis_adapter_factory_1 = require("../factories/redis-adapter.factory");
const allowedOriginsCache = new Set();
let RealtimeGateway = RealtimeGateway_1 = class RealtimeGateway {
    constructor(redisAdapterFactory, jwtService, configService) {
        this.redisAdapterFactory = redisAdapterFactory;
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(RealtimeGateway_1.name);
    }
    async afterInit(server) {
        try {
            const adapter = await this.redisAdapterFactory.createAdapter();
            if (adapter) {
                server.adapter(adapter);
                this.logger.log('✅ Socket.io Redis adapter attached (multi-node sync ACTIVE)');
            }
            else {
                this.logger.log('ℹ️ Socket.io using default in-memory adapter (single-node / mock mode)');
            }
        }
        catch (err) {
            this.logger.warn(`⚠️  Redis adapter unavailable, falling back to in-memory adapter: ${err.message}`);
        }
    }
    onModuleDestroy() {
        this.redisAdapterFactory.disconnect();
    }
    handleConnection(client) {
        const token = client.handshake.auth?.token;
        if (!token) {
            client.disconnect(true);
            return;
        }
        try {
            const payload = this.jwtService.verify(token);
            client.data.user = payload;
            const tenantId = client.handshake.auth?.tenantId ?? 'default';
            const accountId = client.handshake.auth?.accountId;
            this.logger.log(`Client connected: ${client.id} (tenant: ${tenantId}, account: ${accountId}, user: ${payload.sub})`);
            if (tenantId)
                client.join(`tenant:${tenantId}`);
            if (accountId) {
                client.join(`tenant:${tenantId}:account:${accountId}`);
                client.join(`tenant:${tenantId}:account:${accountId}:messages`);
            }
        }
        catch {
            this.logger.warn(`Unauthorized websocket connection attempt from ${client.id}`);
            client.disconnect(true);
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleSubscribe(data, client) {
        const baseRoom = `tenant:${data.tenantId}:account:${data.accountId}`;
        client.join(baseRoom);
        client.join(`${baseRoom}:messages`);
        if (data.channel) {
            const channelRoom = `${baseRoom}:${data.channel}`;
            client.join(channelRoom);
            this.logger.debug(`Client ${client.id} subscribed to room: ${channelRoom}`);
            client.emit('subscribed', { room: channelRoom, status: 'ok' });
        }
        else {
            this.logger.debug(`Client ${client.id} subscribed to account room: ${baseRoom}`);
            client.emit('subscribed', { room: baseRoom, status: 'ok' });
        }
    }
    emitToAccount(tenantId, accountId, event, payload) {
        const room = `tenant:${tenantId}:account:${accountId}`;
        this.server?.to(room).emit(event, payload);
        this.logger.debug(`[WS] Emitted '${event}' → room: ${room}`);
    }
    emitToTenant(tenantId, event, payload) {
        const room = `tenant:${tenantId}`;
        this.server.to(room).emit(event, payload);
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "handleSubscribe", null);
exports.RealtimeGateway = RealtimeGateway = RealtimeGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/realtime',
        cors: {
            origin: (origin, callback) => {
                const isProd = process.env.NODE_ENV === 'production';
                const allowedEnv = process.env.SOCKET_IO_CORS_ORIGINS ||
                    process.env.CORS_ORIGINS ||
                    'http://localhost:5173';
                const allowedList = allowedEnv
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (process.env.FRONTEND_URL) {
                    allowedList.push(process.env.FRONTEND_URL.trim());
                }
                if (!origin ||
                    allowedList.includes(origin) ||
                    allowedList.includes('*') ||
                    (!isProd && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))) {
                    callback(null, true);
                }
                else {
                    callback(new Error(`Socket.io CORS blocked: ${origin}`));
                }
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 30000,
        pingInterval: 10000,
    }),
    __metadata("design:paramtypes", [redis_adapter_factory_1.RedisAdapterFactory,
        jwt_1.JwtService,
        config_1.ConfigService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map