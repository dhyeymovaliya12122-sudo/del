declare const _default: (() => {
    defaultProtocol: "socks5" | "http" | "https";
    rotationEnabled: boolean;
    healthCheckIntervalMs: number;
    maxRetries: number;
    timeoutMs: number;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    defaultProtocol: "socks5" | "http" | "https";
    rotationEnabled: boolean;
    healthCheckIntervalMs: number;
    maxRetries: number;
    timeoutMs: number;
}>;
export default _default;
