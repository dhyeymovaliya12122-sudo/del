"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityGuardModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const webhook_ingestion_log_entity_1 = require("./entities/webhook-ingestion-log.entity");
const hmac_validation_guard_1 = require("./guards/hmac-validation.guard");
const webhook_ingestion_service_1 = require("./services/webhook-ingestion.service");
const cloudflare_waf_service_1 = require("./services/cloudflare-waf.service");
const webhook_controller_1 = require("./controllers/webhook.controller");
const session_hydration_module_1 = require("../session-hydration/session-hydration.module");
let SecurityGuardModule = class SecurityGuardModule {
};
exports.SecurityGuardModule = SecurityGuardModule;
exports.SecurityGuardModule = SecurityGuardModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([webhook_ingestion_log_entity_1.WebhookIngestionLogEntity]),
            session_hydration_module_1.SessionHydrationModule,
        ],
        controllers: [webhook_controller_1.WebhookController],
        providers: [
            hmac_validation_guard_1.HmacValidationGuard,
            webhook_ingestion_service_1.WebhookIngestionService,
            cloudflare_waf_service_1.CloudflareWafService,
        ],
        exports: [hmac_validation_guard_1.HmacValidationGuard],
    })
], SecurityGuardModule);
//# sourceMappingURL=security-guard.module.js.map