"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('app', () => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    authTempDir: process.env.AUTH_TEMP_DIR ?? '/tmp/wa-sessions',
    authCleanupIntervalMs: parseInt(process.env.AUTH_CLEANUP_INTERVAL_MS ?? '300000', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
}));
//# sourceMappingURL=app.config.js.map