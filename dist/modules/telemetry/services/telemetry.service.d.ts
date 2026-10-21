import { OnModuleInit } from '@nestjs/common';
export declare class TelemetryService implements OnModuleInit {
    private readonly logger;
    private readonly registry;
    private readonly messageThroughputCounter;
    private readonly socketReconnectHistogram;
    private readonly proxyRttGauge;
    private readonly disconnectionActiveGauge;
    constructor();
    onModuleInit(): void;
    incrementMessageThroughput(accountId: string, status: string, count?: number): void;
    recordReconnectDuration(accountId: string, durationSeconds: number, status?: string): void;
    setProxyLatency(proxyId: string, latencyMs: number, host?: string, protocol?: string): void;
    setDisconnectionCount(count: number, type?: string): void;
    incrementDisconnection(type?: string): void;
    decrementDisconnection(type?: string): void;
    getMetrics(): Promise<string>;
    getContentType(): string;
    getMetricsSummary(): Promise<{
        timestamp: string;
        service: string;
        metricsCount: number;
        gauges: {
            name: string;
            help: string;
            values: import("prom-client").MetricValue<string>[];
        }[];
        counters: {
            name: string;
            help: string;
            values: import("prom-client").MetricValue<string>[];
        }[];
    }>;
}
