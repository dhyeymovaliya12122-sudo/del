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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationIdMiddleware = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const crypto = require("crypto");
const trace_context_service_1 = require("../../modules/telemetry/services/trace-context.service");
let CorrelationIdMiddleware = class CorrelationIdMiddleware {
    constructor(traceContextService) {
        this.traceContextService = traceContextService;
    }
    use(req, res, next) {
        const correlationId = req.headers['x-correlation-id'] || (0, uuid_1.v4)();
        req.correlationId = correlationId;
        res.setHeader('x-correlation-id', correlationId);
        const incomingTraceParent = req.headers['traceparent'];
        let traceId;
        let parentSpanId;
        if (incomingTraceParent && incomingTraceParent.startsWith('00-')) {
            const parts = incomingTraceParent.split('-');
            traceId = parts[1] || crypto.randomBytes(16).toString('hex');
            parentSpanId = parts[2];
        }
        else {
            traceId = crypto.randomBytes(16).toString('hex');
        }
        let rootSpan = null;
        if (this.traceContextService) {
            const started = this.traceContextService.startTrace('http_ingest', traceId, {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                parentSpanId,
            });
            rootSpan = started.rootSpan;
        }
        const currentSpanId = rootSpan?.spanId || crypto.randomBytes(8).toString('hex');
        const outboundTraceParent = `00-${traceId}-${currentSpanId}-01`;
        req.traceId = traceId;
        req.spanId = currentSpanId;
        res.setHeader('traceparent', outboundTraceParent);
        res.setHeader('x-trace-id', traceId);
        res.on('finish', () => {
            if (this.traceContextService && rootSpan) {
                this.traceContextService.endSpan(traceId, rootSpan.spanId, { statusCode: res.statusCode }, res.statusCode >= 400 ? 'error' : 'completed');
            }
        });
        next();
    }
};
exports.CorrelationIdMiddleware = CorrelationIdMiddleware;
exports.CorrelationIdMiddleware = CorrelationIdMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [trace_context_service_1.TraceContextService])
], CorrelationIdMiddleware);
//# sourceMappingURL=correlation-id.middleware.js.map