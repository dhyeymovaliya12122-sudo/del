declare const _default: (() => {
    nodeEnv: string;
    port: number;
    apiPrefix: string;
    authTempDir: string;
    authCleanupIntervalMs: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    nodeEnv: string;
    port: number;
    apiPrefix: string;
    authTempDir: string;
    authCleanupIntervalMs: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
}>;
export default _default;
