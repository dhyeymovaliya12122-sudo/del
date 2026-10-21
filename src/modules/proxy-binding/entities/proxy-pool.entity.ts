// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-binding/entities/proxy-pool.entity.ts
//  TypeORM entity for the proxy_pool table.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

export type ProxyProtocol = 'socks5' | 'http' | 'https';

@Entity('proxy_pool')
export class ProxyPoolEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  label: string;

  @Column({ type: 'varchar', length: 10 })
  protocol: ProxyProtocol;

  @Column({ length: 255 })
  host: string;

  @Column('integer')
  port: number;

  @Column({ length: 100, nullable: true })
  username?: string;

  @Column({ length: 255, nullable: true })
  password?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_healthy', default: true })
  isHealthy: boolean;

  @Column({ name: 'last_health_check', type: 'datetime', nullable: true })
  lastHealthCheck?: Date;

  @Index()
  @Column({ name: 'assigned_account_id', type: 'uuid', nullable: true })
  assignedAccountId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Returns the full proxy URL string, e.g. socks5://user:pass@host:port */
  toUrl(): string {
    const auth = this.username
      ? `${this.username}:${this.password ?? ''}@`
      : '';
    return `${this.protocol}://${auth}${this.host}:${this.port}`;
  }
}


