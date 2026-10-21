// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/telemetry/services/telemetry.service.ts
//  PILLAR 5: 📈 Prometheus Enterprise Metrics Registry
//
//  Metrics:
//    - wa_message_throughput_total{account_id, status}
//    - wa_socket_reconnect_duration_seconds
//    - wa_proxy_rtt_latency_milliseconds
//    - wa_disconnection_active_gauge
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class TelemetryService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly registry: Registry;

  // ── Core Enterprise Metrics ──────────────────────────────────────────────────
  private readonly messageThroughputCounter: Counter<string>;
  private readonly socketReconnectHistogram: Histogram<string>;
  private readonly proxyRttGauge: Gauge<string>;
  private readonly disconnectionActiveGauge: Gauge<string>;

  constructor() {
    this.registry = new Registry();

    // 1. wa_message_throughput_total — Counter tracking delivery success rates
    this.messageThroughputCounter = new Counter({
      name: 'wa_message_throughput_total',
      help: 'Counter tracking delivery success rates.',
      labelNames: ['account_id', 'status'],
      registers: [this.registry],
    });

    // 2. wa_socket_reconnect_duration_seconds — Histogram measuring Mean Time To Reconnection (MTTR)
    this.socketReconnectHistogram = new Histogram({
      name: 'wa_socket_reconnect_duration_seconds',
      help: 'Histogram measuring Mean Time To Reconnection (MTTR).',
      labelNames: ['account_id', 'status'],
      buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    // 3. wa_proxy_rtt_latency_milliseconds — Gauge tracking proxy health and jitter
    this.proxyRttGauge = new Gauge({
      name: 'wa_proxy_rtt_latency_milliseconds',
      help: 'Gauge tracking proxy health and jitter.',
      labelNames: ['proxy_id', 'host', 'protocol'],
      registers: [this.registry],
    });

    // 4. wa_disconnection_active_gauge — Real-time count of currently disconnected web agents and WhatsApp devices
    this.disconnectionActiveGauge = new Gauge({
      name: 'wa_disconnection_active_gauge',
      help: 'Real-time count of currently disconnected web agents and WhatsApp devices.',
      labelNames: ['type'],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    try {
      collectDefaultMetrics({
        register: this.registry,
        prefix: 'wa_node_',
      });
      this.logger.log('📈 [Telemetry] Prometheus Enterprise Metrics Registry initialized successfully');
    } catch (err: any) {
      this.logger.warn(`[Telemetry] Failed to collect default node metrics: ${err.message}`);
    }
  }

  /**
   * Tracks outbound/inbound message throughput by account and delivery status
   */
  incrementMessageThroughput(accountId: string, status: string, count = 1): void {
    try {
      this.messageThroughputCounter.inc({ account_id: accountId, status }, count);
    } catch (err: any) {
      this.logger.debug(`Error recording throughput metric: ${err.message}`);
    }
  }

  /**
   * Records the reconnection duration (MTTR) in seconds
   */
  recordReconnectDuration(accountId: string, durationSeconds: number, status = 'success'): void {
    try {
      this.socketReconnectHistogram.observe({ account_id: accountId, status }, durationSeconds);
    } catch (err: any) {
      this.logger.debug(`Error recording reconnect metric: ${err.message}`);
    }
  }

  /**
   * Sets the Round-Trip Time (RTT) latency in milliseconds for a proxy
   */
  setProxyLatency(proxyId: string, latencyMs: number, host = 'unknown', protocol = 'socks5'): void {
    try {
      this.proxyRttGauge.set({ proxy_id: proxyId, host, protocol }, latencyMs);
    } catch (err: any) {
      this.logger.debug(`Error recording proxy latency metric: ${err.message}`);
    }
  }

  /**
   * Updates the real-time active disconnection gauge
   */
  setDisconnectionCount(count: number, type = 'total'): void {
    try {
      this.disconnectionActiveGauge.set({ type }, Math.max(0, count));
    } catch (err: any) {
      this.logger.debug(`Error recording disconnection gauge: ${err.message}`);
    }
  }

  incrementDisconnection(type = 'total'): void {
    try {
      this.disconnectionActiveGauge.inc({ type });
    } catch (err: any) {
      this.logger.debug(`Error incrementing disconnection gauge: ${err.message}`);
    }
  }

  decrementDisconnection(type = 'total'): void {
    try {
      this.disconnectionActiveGauge.dec({ type });
    } catch (err: any) {
      this.logger.debug(`Error decrementing disconnection gauge: ${err.message}`);
    }
  }

  /**
   * Scrapes and returns standard Prometheus text exposition format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Returns a high-level JSON summary of current metrics for frontend dashboards
   */
  async getMetricsSummary() {
    const rawMetrics = await this.registry.getMetricsAsJSON();
    return {
      timestamp: new Date().toISOString(),
      service: 'whatsapp-core-engine',
      metricsCount: rawMetrics.length,
      gauges: rawMetrics
        .filter((m) => (m.type as unknown as string) === 'gauge')
        .map((m) => ({ name: m.name, help: m.help, values: m.values })),
      counters: rawMetrics
        .filter((m) => (m.type as unknown as string) === 'counter')
        .map((m) => ({ name: m.name, help: m.help, values: m.values })),
    };
  }
}
