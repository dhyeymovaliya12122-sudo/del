"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('redis', () => ({
    mock: process.env.REDIS_MOCK !== undefined
        ? process.env.REDIS_MOCK === 'true'
        : process.env.NODE_ENV !== 'production',
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
    ttlSeconds: parseInt(process.env.REDIS_TTL_SECONDS ?? '3600', 10),
    keyPrefix: 'wa:session:',
}));
//# sourceMappingURL=redis.config.js.map