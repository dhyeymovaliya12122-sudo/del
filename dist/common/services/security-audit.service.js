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
var SecurityAuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityAuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const security_audit_log_entity_1 = require("../../modules/auth/entities/security-audit-log.entity");
const crypto = require("crypto");
const uuid_1 = require("uuid");
let SecurityAuditService = SecurityAuditService_1 = class SecurityAuditService {
    constructor(auditRepo) {
        this.auditRepo = auditRepo;
        this.logger = new common_1.Logger(SecurityAuditService_1.name);
    }
    generateIntegrityHash(actorUserId, action, timestamp, metadata) {
        const secret = process.env.JWT_SECRET || 'audit-secret-fallback';
        const payload = `${actorUserId}:${action}:${timestamp}:${metadata || ''}:${secret}`;
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
    async record(params) {
        try {
            const now = Date.now();
            const metaStr = params.metadata ? JSON.stringify(params.metadata) : undefined;
            const hash = this.generateIntegrityHash(params.actorUserId || 'anonymous', params.action, now, metaStr);
            const entry = this.auditRepo.create({
                id: (0, uuid_1.v4)(),
                actorUserId: params.actorUserId,
                action: params.action,
                targetAccountId: params.targetAccountId,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                metadata: metaStr,
                integrityHash: hash,
                createdAt: new Date(now),
            });
            await this.auditRepo.save(entry);
        }
        catch (err) {
            this.logger.error(`Failed to record audit log: ${err.message}`);
        }
    }
    async getRecentLogs(limit = 100) {
        return this.auditRepo.find({
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
};
exports.SecurityAuditService = SecurityAuditService;
exports.SecurityAuditService = SecurityAuditService = SecurityAuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(security_audit_log_entity_1.SecurityAuditLogEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SecurityAuditService);
//# sourceMappingURL=security-audit.service.js.map