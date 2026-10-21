import { Response } from 'express';
import { TelemetryService } from '../services/telemetry.service';
import { TraceContextService } from '../services/trace-context.service';
export declare class TelemetryController {
    private readonly telemetryService;
    private readonly traceService;
    constructor(telemetryService: TelemetryService, traceService: TraceContextService);
    getPrometheusMetrics(res: Response): Promise<void>;
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
    getRecentTraces(limit?: string): {
        count: number;
        traces: import("../services/trace-context.service").DistributedTrace[];
    };
    getTraceDetail(traceId: string): import("../services/trace-context.service").DistributedTrace;
}
