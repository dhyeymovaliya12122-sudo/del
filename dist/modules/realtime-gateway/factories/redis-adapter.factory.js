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
var RedisAdapterFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisAdapterFactory = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
let RedisAdapterFactory = RedisAdapterFactory_1 = class RedisAdapterFactory {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RedisAdapterFactory_1.name);
    }
    async createAdapter() {
        const isRedisMock = this.config.get('REDIS_MOCK') === 'true';
        const useRedisAdapter = this.config.get('SOCKET_IO_REDIS_ADAPTER') === 'true';
        if (isRedisMock || !useRedisAdapter) {
            this.logger.log('ℹ️  Socket.io Redis adapter disabled (mock mode / local dev) — using in-memory Socket.io adapter');
            return null;
        }
        const host = this.config.get('redis.host', 'localhost');
        const port = this.config.get('redis.port', 6379);
        const password = this.config.get('redis.password') || undefined;
        const prefix = this.config.get('SOCKET_IO_PUBSUB_PREFIX', 'wa:pubsub');
        this.logger.log(`Connecting Socket.io Redis adapter (pub+sub) → ${host}:${port}`);
        const options = {
            host,
            port,
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 0,
            connectTimeout: 3000,
            retryStrategy: () => null,
        };
        if (password)
            options.password = password;
        this.pubClient = new ioredis_1.default(options);
        this.subClient = this.pubClient.duplicate();
        this.pubClient.on('error', (err) => {
            if (!err.message?.includes('ECONNREFUSED')) {
                this.logger.warn(`Redis pub error: ${err.message}`);
            }
        });
        this.subClient.on('error', (err) => {
            if (!err.message?.includes('ECONNREFUSED')) {
                this.logger.warn(`Redis sub error: ${err.message}`);
            }
        });
        try {
            await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
            this.logger.log('✅ Socket.io Redis pub+sub connections established');
            return (0, redis_adapter_1.createAdapter)(this.pubClient, this.subClient, { key: prefix });
        }
        catch (err) {
            this.logger.warn(`⚠️  Socket.io Redis adapter unavailable (${err.message}). Falling back to in-memory adapter.`);
            this.pubClient?.disconnect();
            this.subClient?.disconnect();
            return null;
        }
    }
    disconnect() {
        this.pubClient?.disconnect();
        this.subClient?.disconnect();
    }
    onModuleDestroy() {
        this.disconnect();
    }
};
exports.RedisAdapterFactory = RedisAdapterFactory;
exports.RedisAdapterFactory = RedisAdapterFactory = RedisAdapterFactory_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisAdapterFactory);
//# sourceMappingURL=redis-adapter.factory.js.map