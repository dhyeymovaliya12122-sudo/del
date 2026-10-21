"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('bullmq', () => ({
    queuePrefix: process.env.BULLMQ_QUEUE_PREFIX ?? 'wa',
    maxMsgPerSecond: parseInt(process.env.BULLMQ_MAX_MSG_PER_SECOND ?? '3', 10),
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY ?? '2', 10),
    maxRetries: parseInt(process.env.BULLMQ_MAX_RETRIES ?? '5', 10),
    backoffDelayMs: parseInt(process.env.BULLMQ_BACKOFF_DELAY_MS ?? '5000', 10),
    stalledIntervalMs: parseInt(process.env.BULLMQ_STALLED_INTERVAL_MS ?? '30000', 10),
    circuitBreakerThreshold: parseInt(process.env.PROXY_CIRCUIT_BREAKER_THRESHOLD ?? '3', 10),
    circuitBreakerResetMs: parseInt(process.env.PROXY_CIRCUIT_BREAKER_RESET_MS ?? '60000', 10),
}));
//# sourceMappingURL=bullmq.config.js.map