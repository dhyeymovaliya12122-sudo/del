"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGatewayModule = void 0;
const common_1 = require("@nestjs/common");
const realtime_gateway_1 = require("./gateways/realtime.gateway");
const realtime_event_service_1 = require("./services/realtime-event.service");
const redis_adapter_factory_1 = require("./factories/redis-adapter.factory");
const pubsub_listener_service_1 = require("./services/pubsub-listener.service");
const auth_module_1 = require("../auth/auth.module");
let RealtimeGatewayModule = class RealtimeGatewayModule {
};
exports.RealtimeGatewayModule = RealtimeGatewayModule;
exports.RealtimeGatewayModule = RealtimeGatewayModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => auth_module_1.AuthModule)],
        providers: [
            realtime_gateway_1.RealtimeGateway,
            realtime_event_service_1.RealtimeEventService,
            redis_adapter_factory_1.RedisAdapterFactory,
            pubsub_listener_service_1.PubSubListenerService,
        ],
        exports: [realtime_event_service_1.RealtimeEventService, realtime_gateway_1.RealtimeGateway],
    })
], RealtimeGatewayModule);
//# sourceMappingURL=realtime-gateway.module.js.map