import type Redis from 'ioredis';
export type AnalyticsEventType = 'flow_start' | 'node_enter' | 'flow_complete' | 'flow_escalate' | 'flow_abandon' | 'cache_hit' | 'llm_call' | 'injection_blocked';
export interface AnalyticsEvent {
    type: AnalyticsEventType;
    accountId: string;
    flowId?: string;
    nodeId?: string;
    nodeType?: string;
    senderJid?: string;
    latencyMs?: number;
    model?: string;
    cacheHit?: boolean;
    timestamp?: number;
}
export declare class AnalyticsEmitterService {
    private readonly redis;
    private readonly logger;
    private readonly STREAM_MAX_LEN;
    constructor(redis: Redis);
    emit(event: AnalyticsEvent): Promise<void>;
    getRecent(accountId: string, count?: number): Promise<AnalyticsEvent[]>;
}
