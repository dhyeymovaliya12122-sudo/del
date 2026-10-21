// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-circuit-breaker/entities/proxy-circuit-breaker.entity.ts
//  TypeORM entity mirroring the proxy_circuit_breaker_state table.
//  Redis holds the live state; this table is for audit / recovery on boot.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { ProxyPoolEntity } from '../../proxy-binding/entities/proxy-pool.entity';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

@Entity('proxy_circuit_breaker_state')
@Unique(['proxyId'])
export class ProxyCircuitBreakerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'proxy_id' })
  proxyId: string;

  @ManyToOne(() => ProxyPoolEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proxy_id' })
  proxy: ProxyPoolEntity;

  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId?: string;

  /** Current circuit state */
  @Column({ type: 'varchar', length: 10 })
  state: CircuitState;

  /** Number of consecutive failures before OPEN */
  @Column({ name: 'failure_count', default: 0 })
  failureCount: number;

  @Column({ name: 'last_failure_at', type: 'datetime', nullable: true })
  lastFailureAt?: Date;

  @Column({ name: 'opened_at', type: 'datetime', nullable: true })
  openedAt?: Date;

  @Column({ name: 'reset_at', type: 'datetime', nullable: true })
  resetAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


