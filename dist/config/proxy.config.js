"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('proxy', () => ({
    defaultProtocol: (process.env.PROXY_DEFAULT_PROTOCOL ?? 'socks5'),
    rotationEnabled: process.env.PROXY_ROTATION_ENABLED === 'true',
    healthCheckIntervalMs: parseInt(process.env.PROXY_HEALTH_CHECK_INTERVAL_MS ?? '30000', 10),
    maxRetries: parseInt(process.env.PROXY_MAX_RETRIES ?? '3', 10),
    timeoutMs: parseInt(process.env.PROXY_TIMEOUT_MS ?? '10000', 10),
}));
//# sourceMappingURL=proxy.config.js.map