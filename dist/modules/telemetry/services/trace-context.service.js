"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TraceContextService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceContextService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
let TraceContextService = TraceContextService_1 = class TraceContextService {
    constructor() {
        this.logger = new common_1.Logger(TraceContextService_1.name);
        this.activeTraces = new Map();
        this.completedTraces = [];
        this.maxCompletedTraces = 200;
    }
    generateTraceId() {
        return crypto.randomBytes(16).toString('hex');
    }
    generateSpanId() {
        return crypto.randomBytes(8).toString('hex');
    }
    parseW3CTraceParent(header) {
        if (!header || typeof header !== 'string')
            return null;
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
    formatW3CTraceParent(traceId, spanId, sampled = true) {
        return `00-${traceId}-${spanId}-${sampled ? '01' : '00'}`;
    }
    startTrace(rootSpanName, existingTraceId, metadata = {}) {
        const traceId = existingTraceId || this.generateTraceId();
        const rootSpanId = this.generateSpanId();
        const rootSpan = {
            spanId: rootSpanId,
            name: rootSpanName,
            startTime: Date.now(),
            attributes: { ...metadata },
            status: 'active',
        };
        const trace = {
            traceId,
            rootSpanName,
            startTime: Date.now(),
            spans: [rootSpan],
            metadata,
        };
        this.activeTraces.set(traceId, trace);
        return { traceId, rootSpan };
    }
    startChildSpan(traceId, spanName, parentSpanId, attributes = {}) {
        let trace = this.activeTraces.get(traceId);
        if (!trace) {
            const started = this.startTrace(spanName, traceId, attributes);
            trace = this.activeTraces.get(traceId);
            return started.rootSpan;
        }
        const spanId = this.generateSpanId();
        const span = {
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
    endSpan(traceId, spanId, attributes = {}, status = 'completed') {
        const trace = this.activeTraces.get(traceId);
        if (!trace)
            return null;
        const span = trace.spans.find((s) => s.spanId === spanId);
        if (!span)
            return null;
        span.endTime = Date.now();
        span.durationMs = Math.max(0, span.endTime - span.startTime);
        span.attributes = { ...span.attributes, ...attributes };
        span.status = status;
        if (span === trace.spans[0]) {
            this.completeTrace(traceId);
        }
        return span;
    }
    completeTrace(traceId) {
        const trace = this.activeTraces.get(traceId);
        if (!trace)
            return;
        trace.endTime = Date.now();
        trace.totalDurationMs = Math.max(0, trace.endTime - trace.startTime);
        this.activeTraces.delete(traceId);
        this.completedTraces.unshift(trace);
        if (this.completedTraces.length > this.maxCompletedTraces) {
            this.completedTraces.pop();
        }
    }
    getTrace(traceId) {
        return this.activeTraces.get(traceId) || this.completedTraces.find((t) => t.traceId === traceId) || null;
    }
    getRecentTraces(limit = 50) {
        const active = Array.from(this.activeTraces.values());
        const combined = [...this.completedTraces, ...active];
        return combined.slice(0, limit);
    }
    async withSpan(traceId, spanName, parentSpanId, fn, attributes = {}) {
        const span = this.startChildSpan(traceId, spanName, parentSpanId, attributes);
        try {
            const result = await fn(span);
            this.endSpan(traceId, span.spanId, { success: true }, 'completed');
            return result;
        }
        catch (err) {
            this.endSpan(traceId, span.spanId, { error: err.message }, 'error');
            throw err;
        }
    }
};
exports.TraceContextService = TraceContextService;
exports.TraceContextService = TraceContextService = TraceContextService_1 = __decorate([
    (0, common_1.Injectable)()
], TraceContextService);
//# sourceMappingURL=trace-context.service.js.map