"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TelemetryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = void 0;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
let TelemetryService = TelemetryService_1 = class TelemetryService {
    constructor() {
        this.logger = new common_1.Logger(TelemetryService_1.name);
        this.registry = new prom_client_1.Registry();
        this.messageThroughputCounter = new prom_client_1.Counter({
            name: 'wa_message_throughput_total',
            help: 'Counter tracking delivery success rates.',
            labelNames: ['account_id', 'status'],
            registers: [this.registry],
        });
        this.socketReconnectHistogram = new prom_client_1.Histogram({
            name: 'wa_socket_reconnect_duration_seconds',
            help: 'Histogram measuring Mean Time To Reconnection (MTTR).',
            labelNames: ['account_id', 'status'],
            buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60],
            registers: [this.registry],
        });
        this.proxyRttGauge = new prom_client_1.Gauge({
            name: 'wa_proxy_rtt_latency_milliseconds',
            help: 'Gauge tracking proxy health and jitter.',
            labelNames: ['proxy_id', 'host', 'protocol'],
            registers: [this.registry],
        });
        this.disconnectionActiveGauge = new prom_client_1.Gauge({
            name: 'wa_disconnection_active_gauge',
            help: 'Real-time count of currently disconnected web agents and WhatsApp devices.',
            labelNames: ['type'],
            registers: [this.registry],
        });
    }
    onModuleInit() {
        try {
            (0, prom_client_1.collectDefaultMetrics)({
                register: this.registry,
                prefix: 'wa_node_',
            });
            this.logger.log('📈 [Telemetry] Prometheus Enterprise Metrics Registry initialized successfully');
        }
        catch (err) {
            this.logger.warn(`[Telemetry] Failed to collect default node metrics: ${err.message}`);
        }
    }
    incrementMessageThroughput(accountId, status, count = 1) {
        try {
            this.messageThroughputCounter.inc({ account_id: accountId, status }, count);
        }
        catch (err) {
            this.logger.debug(`Error recording throughput metric: ${err.message}`);
        }
    }
    recordReconnectDuration(accountId, durationSeconds, status = 'success') {
        try {
            this.socketReconnectHistogram.observe({ account_id: accountId, status }, durationSeconds);
        }
        catch (err) {
            this.logger.debug(`Error recording reconnect metric: ${err.message}`);
        }
    }
    setProxyLatency(proxyId, latencyMs, host = 'unknown', protocol = 'socks5') {
        try {
            this.proxyRttGauge.set({ proxy_id: proxyId, host, protocol }, latencyMs);
        }
        catch (err) {
            this.logger.debug(`Error recording proxy latency metric: ${err.message}`);
        }
    }
    setDisconnectionCount(count, type = 'total') {
        try {
            this.disconnectionActiveGauge.set({ type }, Math.max(0, count));
        }
        catch (err) {
            this.logger.debug(`Error recording disconnection gauge: ${err.message}`);
        }
    }
    incrementDisconnection(type = 'total') {
        try {
            this.disconnectionActiveGauge.inc({ type });
        }
        catch (err) {
            this.logger.debug(`Error incrementing disconnection gauge: ${err.message}`);
        }
    }
    decrementDisconnection(type = 'total') {
        try {
            this.disconnectionActiveGauge.dec({ type });
        }
        catch (err) {
            this.logger.debug(`Error decrementing disconnection gauge: ${err.message}`);
        }
    }
    async getMetrics() {
        return this.registry.metrics();
    }
    getContentType() {
        return this.registry.contentType;
    }
    async getMetricsSummary() {
        const rawMetrics = await this.registry.getMetricsAsJSON();
        return {
            timestamp: new Date().toISOString(),
            service: 'whatsapp-core-engine',
            metricsCount: rawMetrics.length,
            gauges: rawMetrics
                .filter((m) => m.type === 'gauge')
                .map((m) => ({ name: m.name, help: m.help, values: m.values })),
            counters: rawMetrics
                .filter((m) => m.type === 'counter')
                .map((m) => ({ name: m.name, help: m.help, values: m.values })),
        };
    }
};
exports.TelemetryService = TelemetryService;
exports.TelemetryService = TelemetryService = TelemetryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TelemetryService);
//# sourceMappingURL=telemetry.service.js.map