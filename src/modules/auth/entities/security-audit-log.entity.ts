import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ADMIN_CREATED = 'ADMIN_CREATED',
  ADMIN_DELETED = 'ADMIN_DELETED',
  ACCOUNT_ASSIGNED = 'ACCOUNT_ASSIGNED',
  ACCOUNT_REVOKED = 'ACCOUNT_REVOKED',
  CHAT_EXPORT = 'CHAT_EXPORT',
  MEDIA_STREAM = 'MEDIA_STREAM',
  DEV_BYPASS_ATTEMPT = 'DEV_BYPASS_ATTEMPT',
  LOGOUT = 'LOGOUT',
  DISCONNECTION = 'DISCONNECTION',
}

@Entity('security_audit_logs')
export class SecurityAuditLogEntity {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column({ name: 'actor_user_id', nullable: true })
  actorUserId: string;

  @Index()
  @Column({ name: 'action', type: 'text' })
  action: AuditAction | string;

  @Index()
  @Column({ name: 'target_account_id', nullable: true })
  targetAccountId: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'metadata', type: 'text', nullable: true })
  metadata: string; // JSON payload of operational details

  @Column({ name: 'integrity_hash' })
  integrityHash: string; // SHA-256 tamper-evident hash of actor + action + timestamp

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
