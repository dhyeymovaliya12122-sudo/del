"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheModule = exports.REDIS_CLIENT = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
exports.REDIS_CLIENT = 'REDIS_CLIENT';
let CacheModule = class CacheModule {
};
exports.CacheModule = CacheModule;
exports.CacheModule = CacheModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: exports.REDIS_CLIENT,
                inject: [config_1.ConfigService],
                useFactory: async (config) => {
                    const isMock = config.get('redis.mock', false);
                    const isProd = config.get('NODE_ENV') === 'production';
                    if (isMock) {
                        if (isProd) {
                            console.error('🚨 [CRITICAL CONFIG WARNING] REDIS_MOCK=true is active in PRODUCTION! BullMQ queues, Redis streams, circuit breaker, and distributed WebSockets WILL FAIL or drop messages. Set REDIS_MOCK=false and configure REDIS_HOST/REDIS_PORT.');
                        }
                        const RedisMock = require('ioredis-mock');
                        return new RedisMock();
                    }
                    const { default: Redis } = await Promise.resolve().then(() => require('ioredis'));
                    return new Redis({
                        host: config.get('redis.host', 'localhost'),
                        port: config.get('redis.port', 6379),
                        password: config.get('redis.password') || undefined,
                        db: config.get('redis.db', 0),
                        keyPrefix: config.get('redis.keyPrefix', 'wa:session:'),
                        retryStrategy: (times) => Math.min(times * 100, 3000),
                        lazyConnect: false,
                        enableOfflineQueue: true,
                    });
                },
            },
        ],
        exports: [exports.REDIS_CLIENT],
    })
], CacheModule);
//# sourceMappingURL=cache.module.js.map