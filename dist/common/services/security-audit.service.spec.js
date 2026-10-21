"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const security_audit_service_1 = require("./security-audit.service");
const security_audit_log_entity_1 = require("../../modules/auth/entities/security-audit-log.entity");
describe('SecurityAuditService', () => {
    let service;
    let auditRepo;
    beforeEach(() => {
        auditRepo = {
            create: jest.fn().mockImplementation((val) => val),
            save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
            find: jest.fn().mockResolvedValue([]),
        };
        service = new security_audit_service_1.SecurityAuditService(auditRepo);
    });
    describe('record', () => {
        it('should create audit log with SHA-256 integrity hash', async () => {
            await service.record({
                actorUserId: 'admin-123',
                action: security_audit_log_entity_1.AuditAction.LOGIN_SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
                metadata: { loginType: 'password' },
            });
            expect(auditRepo.create).toHaveBeenCalled();
            const createdArg = auditRepo.create.mock.calls[0][0];
            expect(createdArg.actorUserId).toBe('admin-123');
            expect(createdArg.action).toBe(security_audit_log_entity_1.AuditAction.LOGIN_SUCCESS);
            expect(createdArg.ipAddress).toBe('127.0.0.1');
            expect(createdArg.integrityHash).toBeDefined();
            expect(createdArg.integrityHash.length).toBe(64);
            expect(auditRepo.save).toHaveBeenCalled();
        });
        it('should gracefully handle repository errors without throwing to caller', async () => {
            auditRepo.save.mockRejectedValue(new Error('DB failure'));
            await expect(service.record({
                actorUserId: 'admin-123',
                action: security_audit_log_entity_1.AuditAction.LOGIN_FAILED,
            })).resolves.not.toThrow();
        });
    });
    describe('getRecentLogs', () => {
        it('should query repository ordered by createdAt DESC', async () => {
            await service.getRecentLogs(50);
            expect(auditRepo.find).toHaveBeenCalledWith({
                order: { createdAt: 'DESC' },
                take: 50,
            });
        });
    });
});
//# sourceMappingURL=security-audit.service.spec.js.map