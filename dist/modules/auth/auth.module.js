"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const app_user_entity_1 = require("./entities/app-user.entity");
const password_reset_entity_1 = require("./entities/password-reset.entity");
const user_account_access_entity_1 = require("./entities/user-account-access.entity");
const scheduled_message_entity_1 = require("./entities/scheduled-message.entity");
const auto_reply_rule_entity_1 = require("./entities/auto-reply-rule.entity");
const security_audit_log_entity_1 = require("./entities/security-audit-log.entity");
const whatsapp_account_entity_1 = require("../session-hydration/entities/whatsapp-account.entity");
const auth_service_1 = require("./services/auth.service");
const scheduler_service_1 = require("./services/scheduler.service");
const auto_reply_service_1 = require("./services/auto-reply.service");
const security_audit_service_1 = require("../../common/services/security-audit.service");
const disconnection_monitor_service_1 = require("./services/disconnection-monitor.service");
const auth_controller_1 = require("./controllers/auth.controller");
const scheduler_controller_1 = require("./controllers/scheduler.controller");
const auto_reply_controller_1 = require("./controllers/auto-reply.controller");
const session_hydration_module_1 = require("../session-hydration/session-hydration.module");
const realtime_gateway_module_1 = require("../realtime-gateway/realtime-gateway.module");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                app_user_entity_1.AppUserEntity,
                password_reset_entity_1.PasswordResetEntity,
                user_account_access_entity_1.UserAccountAccessEntity,
                scheduled_message_entity_1.ScheduledMessageEntity,
                auto_reply_rule_entity_1.AutoReplyRuleEntity,
                security_audit_log_entity_1.SecurityAuditLogEntity,
                whatsapp_account_entity_1.WhatsappAccountEntity,
            ]),
            config_1.ConfigModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const secret = config.get('JWT_SECRET') || process.env.JWT_SECRET;
                    const isProd = (config.get('NODE_ENV') || process.env.NODE_ENV) === 'production';
                    const defaultSecret = '7c4a8d09ca3762af61e59520943dc26494f8941b47eb3e1e5d3a9c7b0f6e2d1a8b3f5c7e9d1a2b4c6e8f0a1b3d5e7f9a0c2d4e6f8b1d3e5a7c9f0b2d4e6a8c0';
                    if (isProd && (!secret || secret === defaultSecret || secret.length < 32)) {
                        throw new Error('🚨 [SECURITY FATAL] Insecure, default, or weak JWT_SECRET detected in production! Please define a strong JWT_SECRET (minimum 32 characters) in your environment variables before starting the server.');
                    }
                    return {
                        secret: secret || defaultSecret,
                        signOptions: { expiresIn: '7d' },
                    };
                },
            }),
            (0, common_1.forwardRef)(() => session_hydration_module_1.SessionHydrationModule),
            (0, common_1.forwardRef)(() => realtime_gateway_module_1.RealtimeGatewayModule),
        ],
        controllers: [auth_controller_1.AuthController, scheduler_controller_1.SchedulerController, auto_reply_controller_1.AutoReplyController],
        providers: [
            auth_service_1.AuthService,
            scheduler_service_1.SchedulerService,
            auto_reply_service_1.AutoReplyService,
            security_audit_service_1.SecurityAuditService,
            disconnection_monitor_service_1.DisconnectionMonitorService,
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
        ],
        exports: [
            auth_service_1.AuthService,
            auto_reply_service_1.AutoReplyService,
            security_audit_service_1.SecurityAuditService,
            disconnection_monitor_service_1.DisconnectionMonitorService,
            jwt_1.JwtModule,
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map