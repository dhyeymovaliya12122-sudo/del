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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityAuditLogEntity = exports.AuditAction = void 0;
const typeorm_1 = require("typeorm");
var AuditAction;
(function (AuditAction) {
    AuditAction["LOGIN_SUCCESS"] = "LOGIN_SUCCESS";
    AuditAction["LOGIN_FAILED"] = "LOGIN_FAILED";
    AuditAction["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    AuditAction["ADMIN_CREATED"] = "ADMIN_CREATED";
    AuditAction["ADMIN_DELETED"] = "ADMIN_DELETED";
    AuditAction["ACCOUNT_ASSIGNED"] = "ACCOUNT_ASSIGNED";
    AuditAction["ACCOUNT_REVOKED"] = "ACCOUNT_REVOKED";
    AuditAction["CHAT_EXPORT"] = "CHAT_EXPORT";
    AuditAction["MEDIA_STREAM"] = "MEDIA_STREAM";
    AuditAction["DEV_BYPASS_ATTEMPT"] = "DEV_BYPASS_ATTEMPT";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["DISCONNECTION"] = "DISCONNECTION";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
let SecurityAuditLogEntity = class SecurityAuditLogEntity {
};
exports.SecurityAuditLogEntity = SecurityAuditLogEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], SecurityAuditLogEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'actor_user_id', nullable: true }),
    __metadata("design:type", String)
], SecurityAuditLogEntity.prototype, "actorUserId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'action', type: 'text' }),
    __metadata("design:type", String)
], SecurityAuditLogEntity.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'target_account_id', nullable: true }),
    __metadata("design:type", String)
], SecurityAuditLogEntity.prototype, "targetAccountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', nullable: true }),
    __metadata("design:type", String)
], SecurityAuditLogEntity.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_agent', nullable: true }),
    __metadata("design:type", String)
], SecurityAuditLogEntity.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metadata', type: 'text', nullable: true }),
    __metadata("design:type", String)
], SecurityAuditLogEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'integrity_hash' }),
    __metadata("design:type", String)
], SecurityAuditLogEntity.prototype, "integrityHash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], SecurityAuditLogEntity.prototype, "createdAt", void 0);
exports.SecurityAuditLogEntity = SecurityAuditLogEntity = __decorate([
    (0, typeorm_1.Entity)('security_audit_logs')
], SecurityAuditLogEntity);
//# sourceMappingURL=security-audit-log.entity.js.map