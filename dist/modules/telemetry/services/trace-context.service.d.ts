export interface TraceSpan {
    spanId: string;
    name: string;
    parentSpanId?: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    attributes: Record<string, any>;
    status: 'active' | 'completed' | 'error';
}
export interface DistributedTrace {
    traceId: string;
    rootSpanName: string;
    startTime: number;
    endTime?: number;
    totalDurationMs?: number;
    spans: TraceSpan[];
    metadata: Record<string, any>;
}
export declare class TraceContextService {
    private readonly logger;
    private readonly activeTraces;
    private readonly completedTraces;
    private readonly maxCompletedTraces;
    generateTraceId(): string;
    generateSpanId(): string;
    parseW3CTraceParent(header?: string): {
        traceId: string;
        parentSpanId: string;
        sampled: boolean;
    } | null;
    formatW3CTraceParent(traceId: string, spanId: string, sampled?: boolean): string;
    startTrace(rootSpanName: string, existingTraceId?: string, metadata?: Record<string, any>): {
        traceId: string;
        rootSpan: TraceSpan;
    };
    startChildSpan(traceId: string, spanName: string, parentSpanId?: string, attributes?: Record<string, any>): TraceSpan;
    endSpan(traceId: string, spanId: string, attributes?: Record<string, any>, status?: 'completed' | 'error'): TraceSpan | null;
    completeTrace(traceId: string): void;
    getTrace(traceId: string): DistributedTrace | null;
    getRecentTraces(limit?: number): DistributedTrace[];
    withSpan<T>(traceId: string, spanName: string, parentSpanId: string | undefined, fn: (span: TraceSpan) => Promise<T>, attributes?: Record<string, any>): Promise<T>;
}
