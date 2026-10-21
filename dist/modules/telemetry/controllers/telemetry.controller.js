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
exports.TelemetryController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const telemetry_service_1 = require("../services/telemetry.service");
const trace_context_service_1 = require("../services/trace-context.service");
const public_decorator_1 = require("../../../common/decorators/public.decorator");
let TelemetryController = class TelemetryController {
    constructor(telemetryService, traceService) {
        this.telemetryService = telemetryService;
        this.traceService = traceService;
    }
    async getPrometheusMetrics(res) {
        const metrics = await this.telemetryService.getMetrics();
        res.setHeader('Content-Type', this.telemetryService.getContentType());
        res.status(200).send(metrics);
    }
    async getMetricsSummary() {
        return this.telemetryService.getMetricsSummary();
    }
    getRecentTraces(limit) {
        const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50;
        return {
            count: this.traceService.getRecentTraces(parsedLimit).length,
            traces: this.traceService.getRecentTraces(parsedLimit),
        };
    }
    getTraceDetail(traceId) {
        const trace = this.traceService.getTrace(traceId);
        if (!trace) {
            throw new common_1.NotFoundException(`Trace with ID ${traceId} not found`);
        }
        return trace;
    }
};
exports.TelemetryController = TelemetryController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Get)(['metrics', 'telemetry/metrics']),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelemetryController.prototype, "getPrometheusMetrics", null);
__decorate([
    (0, common_1.Get)('telemetry/summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TelemetryController.prototype, "getMetricsSummary", null);
__decorate([
    (0, common_1.Get)('telemetry/traces'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TelemetryController.prototype, "getRecentTraces", null);
__decorate([
    (0, common_1.Get)('telemetry/traces/:traceId'),
    __param(0, (0, common_1.Param)('traceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TelemetryController.prototype, "getTraceDetail", null);
exports.TelemetryController = TelemetryController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [telemetry_service_1.TelemetryService,
        trace_context_service_1.TraceContextService])
], TelemetryController);
//# sourceMappingURL=telemetry.controller.js.map