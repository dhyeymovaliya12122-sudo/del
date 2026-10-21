"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryModule = void 0;
const common_1 = require("@nestjs/common");
const telemetry_service_1 = require("./services/telemetry.service");
const trace_context_service_1 = require("./services/trace-context.service");
const telemetry_controller_1 = require("./controllers/telemetry.controller");
let TelemetryModule = class TelemetryModule {
};
exports.TelemetryModule = TelemetryModule;
exports.TelemetryModule = TelemetryModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [telemetry_controller_1.TelemetryController],
        providers: [telemetry_service_1.TelemetryService, trace_context_service_1.TraceContextService],
        exports: [telemetry_service_1.TelemetryService, trace_context_service_1.TraceContextService],
    })
], TelemetryModule);
//# sourceMappingURL=telemetry.module.js.map