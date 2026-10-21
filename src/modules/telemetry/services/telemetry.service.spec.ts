// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/telemetry/services/telemetry.service.spec.ts
//  Test Suite for PILLAR 5: Prometheus Enterprise Metrics Registry & OpenTelemetry
// ─────────────────────────────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryService } from './telemetry.service';
import { TraceContextService } from './trace-context.service';

describe('Pillar 5: Telemetry & Observability Mesh', () => {
  let telemetryService: TelemetryService;
  let traceService: TraceContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelemetryService, TraceContextService],
    }).compile();

    telemetryService = module.get<TelemetryService>(TelemetryService);
    traceService = module.get<TraceContextService>(TraceContextService);
    telemetryService.onModuleInit();
  });

  describe('Prometheus Enterprise Metrics Registry', () => {
    it('should initialize and register all 4 enterprise metrics', async () => {
      const output = await telemetryService.getMetrics();

      expect(output).toContain('# HELP wa_message_throughput_total');
      expect(output).toContain('# TYPE wa_message_throughput_total counter');

      expect(output).toContain('# HELP wa_socket_reconnect_duration_seconds');
      expect(output).toContain('# TYPE wa_socket_reconnect_duration_seconds histogram');

      expect(output).toContain('# HELP wa_proxy_rtt_latency_milliseconds');
      expect(output).toContain('# TYPE wa_proxy_rtt_latency_milliseconds gauge');

      expect(output).toContain('# HELP wa_disconnection_active_gauge');
      expect(output).toContain('# TYPE wa_disconnection_active_gauge gauge');
    });

    it('should increment wa_message_throughput_total with account_id and status labels', async () => {
      telemetryService.incrementMessageThroughput('acc-us-east', 'sent', 5);
      telemetryService.incrementMessageThroughput('acc-us-east', 'failed', 1);

      const metrics = await telemetryService.getMetrics();
      expect(metrics).toContain('wa_message_throughput_total{account_id="acc-us-east",status="sent"} 5');
      expect(metrics).toContain('wa_message_throughput_total{account_id="acc-us-east",status="failed"} 1');
    });

    it('should record wa_socket_reconnect_duration_seconds into histogram buckets', async () => {
      telemetryService.recordReconnectDuration('acc-reconnect-1', 0.45, 'success');

      const metrics = await telemetryService.getMetrics();
      expect(metrics).toContain('wa_socket_reconnect_duration_seconds_bucket{le="0.5",account_id="acc-reconnect-1",status="success"} 1');
      expect(metrics).toContain('wa_socket_reconnect_duration_seconds_count{account_id="acc-reconnect-1",status="success"} 1');
    });

    it('should track wa_proxy_rtt_latency_milliseconds for active proxies', async () => {
      telemetryService.setProxyLatency('proxy-node-44', 38.5, '104.244.75.12', 'socks5');

      const metrics = await telemetryService.getMetrics();
      expect(metrics).toContain('wa_proxy_rtt_latency_milliseconds{proxy_id="proxy-node-44",host="104.244.75.12",protocol="socks5"} 38.5');
    });

    it('should maintain real-time count in wa_disconnection_active_gauge', async () => {
      telemetryService.setDisconnectionCount(4, 'total');
      telemetryService.incrementDisconnection('user');

      const metrics = await telemetryService.getMetrics();
      expect(metrics).toContain('wa_disconnection_active_gauge{type="total"} 4');
      expect(metrics).toContain('wa_disconnection_active_gauge{type="user"} 1');

      telemetryService.decrementDisconnection('user');
      const updatedMetrics = await telemetryService.getMetrics();
      expect(updatedMetrics).toContain('wa_disconnection_active_gauge{type="user"} 0');
    });
  });

  describe('OpenTelemetry Distributed Tracing', () => {
    it('should generate valid 32-hex trace ID and 16-hex span ID', () => {
      const traceId = traceService.generateTraceId();
      const spanId = traceService.generateSpanId();

      expect(traceId).toHaveLength(32);
      expect(spanId).toHaveLength(16);
      expect(/^[0-9a-f]{32}$/.test(traceId)).toBe(true);
      expect(/^[0-9a-f]{16}$/.test(spanId)).toBe(true);
    });

    it('should parse and format standard W3C traceparent headers', () => {
      const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
      const spanId = '00f067aa0ba902b7';
      const header = traceService.formatW3CTraceParent(traceId, spanId, true);

      expect(header).toBe(`00-${traceId}-${spanId}-01`);

      const parsed = traceService.parseW3CTraceParent(header);
      expect(parsed).toEqual({
        traceId,
        parentSpanId: spanId,
        sampled: true,
      });
    });

    it('should capture full lifecycle: http_ingest -> queue_delay -> noise_ack', async () => {
      // 1. Ingest Stage
      const { traceId, rootSpan } = traceService.startTrace('http_ingest', undefined, {
        client: 'webhook-gateway',
      });
      expect(rootSpan.status).toBe('active');

      // 2. Queue Dispatch Stage
      const queueSpan = traceService.startChildSpan(traceId, 'queue_delay', rootSpan.spanId, {
        queue: 'outbound-high-priority',
      });
      traceService.endSpan(traceId, queueSpan.spanId, { queueDelayMs: 12 });
      expect(queueSpan.status).toBe('completed');
      expect(queueSpan.durationMs).toBeDefined();

      // 3. Baileys Engine TCP Noise ACK Stage
      const noiseSpan = traceService.startChildSpan(traceId, 'noise_ack', queueSpan.spanId, {
        carrier: 'Meta WhatsApp CDN',
      });
      traceService.endSpan(traceId, noiseSpan.spanId, { ackTimeMs: 48 });
      expect(noiseSpan.status).toBe('completed');

      // 4. Complete Root Ingest Span
      traceService.endSpan(traceId, rootSpan.spanId);

      const archived = traceService.getTrace(traceId);
      expect(archived).toBeDefined();
      expect(archived?.spans).toHaveLength(3);
      expect(archived?.spans.map((s) => s.name)).toEqual(['http_ingest', 'queue_delay', 'noise_ack']);
      expect(archived?.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
