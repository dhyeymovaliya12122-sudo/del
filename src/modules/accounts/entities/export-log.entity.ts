import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('export_logs')
export class ExportLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', length: 100, nullable: true })
  userId?: string;

  @Column({ name: 'username', length: 150, default: 'anonymous' })
  username: string;

  @Column({ name: 'user_role', length: 50, default: 'ADMIN' })
  userRole: string;

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ length: 50, default: 'all' })
  scope: 'all' | 'single_chat' | 'custom' | 'unreplied';

  @Column({ length: 30, default: 'zip' })
  format: 'excel' | 'pdf' | 'zip' | 'db_snapshot';

  @Column({ name: 'pii_redacted', default: false })
  piiRedacted: boolean;

  @Column({ name: 'password_protected', default: false })
  passwordProtected: boolean;

  @Column({ name: 'record_count', default: 0 })
  recordCount: number;

  @Column({ name: 'file_size_bytes', type: 'bigint', default: 0 })
  fileSizeBytes: number;

  @Column({ name: 'ip_address', length: 60, nullable: true })
  ipAddress?: string;

  @Column({ length: 30, default: 'completed' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
