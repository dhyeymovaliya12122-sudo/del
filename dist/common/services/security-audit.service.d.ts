import { Repository } from 'typeorm';
import { SecurityAuditLogEntity, AuditAction } from '../../modules/auth/entities/security-audit-log.entity';
export declare class SecurityAuditService {
    private readonly auditRepo;
    private readonly logger;
    constructor(auditRepo: Repository<SecurityAuditLogEntity>);
    private generateIntegrityHash;
    record(params: {
        actorUserId?: string;
        action: AuditAction | string;
        targetAccountId?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }): Promise<void>;
    getRecentLogs(limit?: number): Promise<SecurityAuditLogEntity[]>;
}
