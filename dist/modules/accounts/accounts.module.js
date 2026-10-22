"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const whatsapp_account_entity_1 = require("../session-hydration/entities/whatsapp-account.entity");
const whatsapp_chat_entity_1 = require("../session-hydration/entities/whatsapp-chat.entity");
const whatsapp_contact_entity_1 = require("../session-hydration/entities/whatsapp-contact.entity");
const whatsapp_message_entity_1 = require("../session-hydration/entities/whatsapp-message.entity");
const whatsapp_call_entity_1 = require("../session-hydration/entities/whatsapp-call.entity");
const proxy_pool_entity_1 = require("../proxy-binding/entities/proxy-pool.entity");
const proxy_circuit_breaker_entity_1 = require("../proxy-circuit-breaker/entities/proxy-circuit-breaker.entity");
const session_auth_entity_1 = require("../session-hydration/entities/session-auth.entity");
const export_log_entity_1 = require("./entities/export-log.entity");
const user_account_access_entity_1 = require("../auth/entities/user-account-access.entity");
const accounts_controller_1 = require("./controllers/accounts.controller");
const accounts_service_1 = require("./services/accounts.service");
const whatsapp_api_service_1 = require("./services/whatsapp-api.service");
const whatsapp_web_controller_1 = require("./controllers/whatsapp-web.controller");
const whatsapp_web_service_1 = require("./services/whatsapp-web.service");
const export_backup_controller_1 = require("./controllers/export-backup.controller");
const export_backup_service_1 = require("./services/export-backup.service");
const backup_scheduler_service_1 = require("./services/backup-scheduler.service");
const data_lifecycle_eviction_service_1 = require("./services/data-lifecycle-eviction.service");
const proxy_circuit_breaker_module_1 = require("../proxy-circuit-breaker/proxy-circuit-breaker.module");
const session_hydration_module_1 = require("../session-hydration/session-hydration.module");
const auth_module_1 = require("../auth/auth.module");
const account_isolation_guard_1 = require("../../common/guards/account-isolation.guard");
let AccountsModule = class AccountsModule {
};
exports.AccountsModule = AccountsModule;
exports.AccountsModule = AccountsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                whatsapp_account_entity_1.WhatsappAccountEntity,
                whatsapp_chat_entity_1.WhatsappChatEntity,
                whatsapp_contact_entity_1.WhatsappContactEntity,
                whatsapp_message_entity_1.WhatsappMessageEntity,
                whatsapp_call_entity_1.WhatsappCallEntity,
                session_auth_entity_1.SessionAuthEntity,
                proxy_pool_entity_1.ProxyPoolEntity,
                proxy_circuit_breaker_entity_1.ProxyCircuitBreakerEntity,
                export_log_entity_1.ExportLogEntity,
                user_account_access_entity_1.UserAccountAccessEntity,
            ]),
            proxy_circuit_breaker_module_1.ProxyCircuitBreakerModule,
            session_hydration_module_1.SessionHydrationModule,
            auth_module_1.AuthModule,
        ],
        controllers: [accounts_controller_1.AccountsController, whatsapp_web_controller_1.WhatsappWebController, export_backup_controller_1.ExportBackupController],
        providers: [
            accounts_service_1.AccountsService, whatsapp_api_service_1.WhatsappApiService, whatsapp_web_service_1.WhatsappWebService,
            export_backup_service_1.ExportBackupService, backup_scheduler_service_1.BackupSchedulerService, data_lifecycle_eviction_service_1.DataLifecycleEvictionService,
            account_isolation_guard_1.AccountIsolationGuard,
        ],
        exports: [accounts_service_1.AccountsService, whatsapp_api_service_1.WhatsappApiService, whatsapp_web_service_1.WhatsappWebService, export_backup_service_1.ExportBackupService, backup_scheduler_service_1.BackupSchedulerService, data_lifecycle_eviction_service_1.DataLifecycleEvictionService],
    })
], AccountsModule);
//# sourceMappingURL=accounts.module.js.map