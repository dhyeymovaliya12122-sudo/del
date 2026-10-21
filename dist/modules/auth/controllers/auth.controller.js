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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("../services/auth.service");
const app_user_entity_1 = require("../entities/app-user.entity");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const public_decorator_1 = require("../../../common/decorators/public.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const security_audit_service_1 = require("../../../common/services/security-audit.service");
const security_audit_log_entity_1 = require("../entities/security-audit-log.entity");
const disconnection_monitor_service_1 = require("../services/disconnection-monitor.service");
const auth_dto_1 = require("../dto/auth.dto");
let AuthController = class AuthController {
    constructor(authService, auditService, disconnectionMonitor) {
        this.authService = authService;
        this.auditService = auditService;
        this.disconnectionMonitor = disconnectionMonitor;
    }
    async login(body, req, res) {
        try {
            const result = await this.authService.login(body.username, body.password);
            res.cookie('wa_token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            await this.auditService.record({
                actorUserId: result.user?.id,
                action: security_audit_log_entity_1.AuditAction.LOGIN_SUCCESS,
                ipAddress: req.ip || req.headers['x-forwarded-for'],
                userAgent: req.headers['user-agent'],
                metadata: { username: body.username },
            });
            this.disconnectionMonitor.resolveReconnection(result.user?.username || body.username);
            return result;
        }
        catch (err) {
            await this.auditService.record({
                action: security_audit_log_entity_1.AuditAction.LOGIN_FAILED,
                ipAddress: req.ip || req.headers['x-forwarded-for'],
                userAgent: req.headers['user-agent'],
                metadata: { username: body.username, error: err.message },
            });
            throw err;
        }
    }
    async logout(body, req, res) {
        res.clearCookie('wa_token', { path: '/' });
        const personName = body?.displayName || body?.username || 'User';
        const personId = body?.username || `user-${Date.now()}`;
        this.disconnectionMonitor.recordDisconnection(personId, personName, 'user');
        await this.auditService.record({
            action: security_audit_log_entity_1.AuditAction.LOGOUT,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            metadata: { personName, username: body?.username },
        }).catch(() => null);
        return { success: true, message: `${personName} logged out successfully` };
    }
    getDisconnections() {
        return this.disconnectionMonitor.getActiveDisconnections();
    }
    dismissDisconnection(id) {
        const dismissed = this.disconnectionMonitor.dismissAlert(id);
        return { success: dismissed };
    }
    async getMe(user) {
        return this.authService.getMe(user.sub);
    }
    async getAdmins() {
        return this.authService.getAllAdmins();
    }
    async getAccountsWithAdmins() {
        return this.authService.getAccountsWithAdmins();
    }
    async getAuditLogs() {
        return this.auditService.getRecentLogs(200);
    }
    async createAdminRest(user, body, req) {
        const result = await this.authService.createAdmin(body.username, body.password, body.displayName);
        await this.auditService.record({
            actorUserId: user?.sub || user?.id || 'superadmin',
            action: security_audit_log_entity_1.AuditAction.ADMIN_CREATED,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            metadata: { createdUsername: body.username, createdId: result.id },
        });
        return result;
    }
    async deleteAdmin(user, id, req) {
        const result = await this.authService.deleteAdmin(id);
        await this.auditService.record({
            actorUserId: user?.sub || user?.id || 'superadmin',
            action: security_audit_log_entity_1.AuditAction.ADMIN_DELETED,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            metadata: { targetAdminId: id },
        });
        return result;
    }
    async assignAccountRest(user, userId, body, req) {
        const result = await this.authService.assignAccountToAdmin(userId, body.accountId);
        await this.auditService.record({
            actorUserId: user?.sub || user?.id || 'superadmin',
            action: security_audit_log_entity_1.AuditAction.ACCOUNT_ASSIGNED,
            targetAccountId: body.accountId,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            metadata: { targetUserId: userId },
        });
        return result;
    }
    async revokeAccountRest(user, userId, accountId, req) {
        const result = await this.authService.revokeAccountAccess(userId, accountId);
        await this.auditService.record({
            actorUserId: user?.sub || user?.id || 'superadmin',
            action: security_audit_log_entity_1.AuditAction.ACCOUNT_REVOKED,
            targetAccountId: accountId,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            metadata: { targetUserId: userId },
        });
        return result;
    }
    async updatePassword(user, body, req) {
        if (user.role !== app_user_entity_1.UserRole.SUPER_ADMIN && user.sub !== body.userId) {
            throw new common_1.UnauthorizedException('Cannot update another admin\'s password');
        }
        const result = await this.authService.updatePassword(body.userId, body.newPassword);
        await this.auditService.record({
            actorUserId: user.sub,
            action: security_audit_log_entity_1.AuditAction.PASSWORD_CHANGE,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            metadata: { targetUserId: body.userId },
        });
        return result;
    }
    async toggleAdmin(userId) {
        return this.authService.toggleAdminStatus(userId);
    }
    async forgotPassword(body) {
        await this.authService.forgotPassword(body.identity);
        return { success: true, message: 'If that user exists, a reset token has been generated.' };
    }
    async resetPassword(body) {
        await this.authService.resetPassword(body.token, body.newPassword);
        return { success: true, message: 'Password has been reset successfully.' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 300_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LogoutDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('disconnections'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getDisconnections", null);
__decorate([
    (0, common_1.Delete)('disconnections/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "dismissDisconnection", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, common_1.Get)('admins'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAdmins", null);
__decorate([
    (0, common_1.Get)('accounts-with-admins'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAccountsWithAdmins", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Post)('admins'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, auth_dto_1.CreateAdminDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "createAdminRest", null);
__decorate([
    (0, common_1.Delete)('admins/:id'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "deleteAdmin", null);
__decorate([
    (0, common_1.Post)('admins/:userId/accounts'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "assignAccountRest", null);
__decorate([
    (0, common_1.Delete)('admins/:userId/accounts/:accountId'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Param)('accountId')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "revokeAccountRest", null);
__decorate([
    (0, common_1.Post)('update-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, auth_dto_1.UpdatePasswordDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updatePassword", null);
__decorate([
    (0, common_1.Post)('toggle-admin/:userId'),
    (0, roles_decorator_1.Roles)(app_user_entity_1.UserRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "toggleAdmin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 300_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 300_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        security_audit_service_1.SecurityAuditService,
        disconnection_monitor_service_1.DisconnectionMonitorService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map