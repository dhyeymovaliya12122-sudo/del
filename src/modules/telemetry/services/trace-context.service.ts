// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/telemetry/services/trace-context.service.ts
//  PILLAR 5: 📈 OpenTelemetry Distributed Tracing Engine
//
//  Lifecycle Stages:
//    [Client Webhook / Ingest] ──► [BullMQ Job Dispatch] ──► [Baileys TCP Engine]
//     trace_id: a89f...             trace_id: a89f...          trace_id: a89f...
//     span: http_ingest             span: queue_delay (12ms)   span: noise_ack (48ms)
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

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

@Injectable()
export class TraceContextService {
  private readonly logger = new Logger(TraceContextService.name);
  private readonly activeTraces = new Map<string, DistributedTrace>();
  private readonly completedTraces: DistributedTrace[] = [];
  private readonly maxCompletedTraces = 200;

  /**
   * Generates a 16-byte random trace ID (32 hex characters)
   */
  generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generates an 8-byte random span ID (16 hex characters)
   */
  generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Parses standard W3C traceparent header:
   * Format: version-trace_id-parent_id-trace_flags (e.g. 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01)
   */
  parseW3CTraceParent(header?: string): { traceId: string; parentSpanId: string; sampled: boolean } | null {
    if (!header || typeof header !== 'string') return null;
    const parts = header.trim().split('-');
    if (parts.length === 4 && parts[0] === '00') {
      return {
        traceId: parts[1],
        parentSpanId: parts[2],
        sampled: parts[3] === '01',
      };
    }
    return null;
  }

  /**
   * Formats a W3C traceparent header string
   */
  formatW3CTraceParent(traceId: string, spanId: string, sampled = true): string {
    return `00-${traceId}-${spanId}-${sampled ? '01' : '00'}`;
  }

  /**
   * Starts a new distributed trace lifecycle
   */
  startTrace(
    rootSpanName: string,
    existingTraceId?: string,
    metadata: Record<string, any> = {},
  ): { traceId: string; rootSpan: TraceSpan } {
    const traceId = existingTraceId || this.generateTraceId();
    const rootSpanId = this.generateSpanId();

    const rootSpan: TraceSpan = {
      spanId: rootSpanId,
      name: rootSpanName,
      startTime: Date.now(),
      attributes: { ...metadata },
      status: 'active',
    };

    const trace: DistributedTrace = {
      traceId,
      rootSpanName,
      startTime: Date.now(),
      spans: [rootSpan],
      metadata,
    };

    this.activeTraces.set(traceId, trace);
    return { traceId, rootSpan };
  }

  /**
   * Starts a child span within an active trace (e.g. queue_delay or noise_ack)
   */
  startChildSpan(
    traceId: string,
    spanName: string,
    parentSpanId?: string,
    attributes: Record<string, any> = {},
  ): TraceSpan {
    let trace = this.activeTraces.get(traceId);
    if (!trace) {
      const started = this.startTrace(spanName, traceId, attributes);
      trace = this.activeTraces.get(traceId)!;
      return started.rootSpan;
    }

    const spanId = this.generateSpanId();
    const span: TraceSpan = {
      spanId,
      name: spanName,
      parentSpanId: parentSpanId || trace.spans[0]?.spanId,
      startTime: Date.now(),
      attributes,
      status: 'active',
    };

    trace.spans.push(span);
    return span;
  }

  /**
   * Ends a span, computing its execution duration
   */
  endSpan(
    traceId: string,
    spanId: string,
    attributes: Record<string, any> = {},
    status: 'completed' | 'error' = 'completed',
  ): TraceSpan | null {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return null;

    const span = trace.spans.find((s) => s.spanId === spanId);
    if (!span) return null;

    span.endTime = Date.now();
    span.durationMs = Math.max(0, span.endTime - span.startTime);
    span.attributes = { ...span.attributes, ...attributes };
    span.status = status;

    // Check if root span ended, completing the entire distributed trace
    if (span === trace.spans[0]) {
      this.completeTrace(traceId);
    }

    return span;
  }

  /**
   * Completes a trace and archives it into recent traces ring buffer
   */
  completeTrace(traceId: string): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.totalDurationMs = Math.max(0, trace.endTime - trace.startTime);

    this.activeTraces.delete(traceId);
    this.completedTraces.unshift(trace);

    if (this.completedTraces.length > this.maxCompletedTraces) {
      this.completedTraces.pop();
    }
  }

  /**
   * Retrieves active or completed trace by ID
   */
  getTrace(traceId: string): DistributedTrace | null {
    return this.activeTraces.get(traceId) || this.completedTraces.find((t) => t.traceId === traceId) || null;
  }

  /**
   * Returns recent distributed traces for debugging & telemetry inspection
   */
  getRecentTraces(limit = 50): DistributedTrace[] {
    const active = Array.from(this.activeTraces.values());
    const combined = [...this.completedTraces, ...active];
    return combined.slice(0, limit);
  }

  /**
   * Executes an async callback within an automated span
   */
  async withSpan<T>(
    traceId: string,
    spanName: string,
    parentSpanId: string | undefined,
    fn: (span: TraceSpan) => Promise<T>,
    attributes: Record<string, any> = {},
  ): Promise<T> {
    const span = this.startChildSpan(traceId, spanName, parentSpanId, attributes);
    try {
      const result = await fn(span);
      this.endSpan(traceId, span.spanId, { success: true }, 'completed');
      return result;
    } catch (err: any) {
      this.endSpan(traceId, span.spanId, { error: err.message }, 'error');
      throw err;
    }
  }
}
