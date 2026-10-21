declare const _default: (() => {
    queuePrefix: string;
    maxMsgPerSecond: number;
    concurrency: number;
    maxRetries: number;
    backoffDelayMs: number;
    stalledIntervalMs: number;
    circuitBreakerThreshold: number;
    circuitBreakerResetMs: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    queuePrefix: string;
    maxMsgPerSecond: number;
    concurrency: number;
    maxRetries: number;
    backoffDelayMs: number;
    stalledIntervalMs: number;
    circuitBreakerThreshold: number;
    circuitBreakerResetMs: number;
}>;
export default _default;
