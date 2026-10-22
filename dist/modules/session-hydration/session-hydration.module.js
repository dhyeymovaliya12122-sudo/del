"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionHydrationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const session_auth_entity_1 = require("./entities/session-auth.entity");
const whatsapp_account_entity_1 = require("./entities/whatsapp-account.entity");
const whatsapp_chat_entity_1 = require("./entities/whatsapp-chat.entity");
const whatsapp_contact_entity_1 = require("./entities/whatsapp-contact.entity");
const whatsapp_message_entity_1 = require("./entities/whatsapp-message.entity");
const whatsapp_call_entity_1 = require("./entities/whatsapp-call.entity");
const user_account_access_entity_1 = require("../auth/entities/user-account-access.entity");
const app_user_entity_1 = require("../auth/entities/app-user.entity");
const session_crypto_service_1 = require("./services/session-crypto.service");
const session_sync_manager_1 = require("./services/session-sync.manager");
const session_hydration_service_1 = require("./services/session-hydration.service");
const baileys_media_pipeline_service_1 = require("./services/baileys-media-pipeline.service");
const baileys_sync_service_1 = require("./services/baileys-sync.service");
const baileys_client_factory_1 = require("./factories/baileys-client.factory");
const behavioral_typing_service_1 = require("./services/behavioral-typing.service");
const account_warmup_service_1 = require("./services/account-warmup.service");
const distributed_socket_manager_service_1 = require("./services/distributed-socket-manager.service");
const session_hydration_controller_1 = require("./controllers/session-hydration.controller");
const proxy_binding_module_1 = require("../proxy-binding/proxy-binding.module");
const realtime_gateway_module_1 = require("../realtime-gateway/realtime-gateway.module");
let SessionHydrationModule = class SessionHydrationModule {
};
exports.SessionHydrationModule = SessionHydrationModule;
exports.SessionHydrationModule = SessionHydrationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                session_auth_entity_1.SessionAuthEntity,
                whatsapp_account_entity_1.WhatsappAccountEntity,
                whatsapp_chat_entity_1.WhatsappChatEntity,
                whatsapp_contact_entity_1.WhatsappContactEntity,
                whatsapp_message_entity_1.WhatsappMessageEntity,
                whatsapp_call_entity_1.WhatsappCallEntity,
                user_account_access_entity_1.UserAccountAccessEntity,
                app_user_entity_1.AppUserEntity,
            ]),
            proxy_binding_module_1.ProxyBindingModule,
            realtime_gateway_module_1.RealtimeGatewayModule,
            (0, common_1.forwardRef)(() => auth_module_1.AuthModule),
        ],
        controllers: [session_hydration_controller_1.SessionHydrationController],
        providers: [
            session_crypto_service_1.SessionCryptoService,
            session_sync_manager_1.SessionSyncManager,
            session_hydration_service_1.SessionHydrationService,
            baileys_media_pipeline_service_1.BaileysMediaPipelineService,
            baileys_sync_service_1.BaileysSyncService,
            baileys_client_factory_1.BaileysClientFactory,
            behavioral_typing_service_1.BehavioralTypingService,
            account_warmup_service_1.AccountWarmupService,
            distributed_socket_manager_service_1.DistributedSocketManagerService,
        ],
        exports: [
            typeorm_1.TypeOrmModule,
            session_hydration_service_1.SessionHydrationService,
            session_sync_manager_1.SessionSyncManager,
            baileys_media_pipeline_service_1.BaileysMediaPipelineService,
            baileys_sync_service_1.BaileysSyncService,
            baileys_client_factory_1.BaileysClientFactory,
            behavioral_typing_service_1.BehavioralTypingService,
            account_warmup_service_1.AccountWarmupService,
            distributed_socket_manager_service_1.DistributedSocketManagerService,
        ],
    })
], SessionHydrationModule);
//# sourceMappingURL=session-hydration.module.js.map