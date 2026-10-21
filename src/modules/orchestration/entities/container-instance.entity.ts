// ─────────────────────────────────────────────────────────────────────────────
//  modules/orchestration/entities/container-instance.entity.ts
//  Tracks all provisioned WhatsApp engine containers in PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

export type ContainerStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
export type HealthState = 'healthy' | 'unhealthy' | 'unknown';

@Entity('container_instances')
export class ContainerInstanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Docker service ID or Coolify application UUID */
  @Column({ name: 'service_id', length: 100, unique: true })
  serviceId: string;

  @Index()
  @Column({ name: 'account_id', length: 36 })
  accountId: string;

  @Column({ name: 'tenant_id', length: 36 })
  tenantId: string;

  @Column({ name: 'phone_number', length: 20 })
  phoneNumber: string;

  @Column({ name: 'orchestrator_type', length: 20, default: 'swarm' })
  orchestratorType: string;  // 'swarm' | 'coolify'

  @Column({ type: 'varchar', length: 20, default: 'starting' })
  status: ContainerStatus;

  @Column({ name: 'health_state', type: 'varchar', length: 20, default: 'unknown' })
  healthState: HealthState;

  @Column({ name: 'desired_replicas', default: 1 })
  desiredReplicas: number;

  @Column({ name: 'running_replicas', default: 0 })
  runningReplicas: number;

  @Column({ name: 'region', length: 50, nullable: true })
  region?: string;

  @Column({ name: 'proxy_url', length: 500, nullable: true })
  proxyUrl?: string;

  /** Number of auto-heal events triggered */
  @Column({ name: 'heal_count', default: 0 })
  healCount: number;

  @Column({ name: 'last_healed_at', type: 'datetime', nullable: true })
  lastHealedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


