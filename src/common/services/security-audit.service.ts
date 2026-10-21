import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityAuditLogEntity, AuditAction } from '../../modules/auth/entities/security-audit-log.entity';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(
    @InjectRepository(SecurityAuditLogEntity)
    private readonly auditRepo: Repository<SecurityAuditLogEntity>,
  ) {}

  private generateIntegrityHash(actorUserId: string, action: string, timestamp: number, metadata?: string): string {
    const secret = process.env.JWT_SECRET || 'audit-secret-fallback';
    const payload = `${actorUserId}:${action}:${timestamp}:${metadata || ''}:${secret}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async record(params: {
    actorUserId?: string;
    action: AuditAction | string;
    targetAccountId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const now = Date.now();
      const metaStr = params.metadata ? JSON.stringify(params.metadata) : undefined;
      const hash = this.generateIntegrityHash(params.actorUserId || 'anonymous', params.action, now, metaStr);

      const entry = this.auditRepo.create({
        id: uuidv4(),
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
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`);
    }
  }

  async getRecentLogs(limit = 100): Promise<SecurityAuditLogEntity[]> {
    return this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
