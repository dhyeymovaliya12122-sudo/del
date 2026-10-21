// ─────────────────────────────────────────────────────────────────────────────
//  modules/orchestration/entities/container-heal-log.entity.ts
//  Audit trail for every auto-heal event.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ContainerInstanceEntity } from './container-instance.entity';

@Entity('container_heal_log')
export class ContainerHealLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'container_instance_id', type: 'uuid' })
  containerInstanceId: string;

  @ManyToOne(() => ContainerInstanceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'container_instance_id' })
  containerInstance: ContainerInstanceEntity;

  @Column({ name: 'account_id', length: 36 })
  accountId: string;

  @Column({ name: 'heal_reason', length: 200 })
  healReason: string;  // e.g. 'task_failed', 'no_heartbeat', 'proxy_circuit_open'

  @Column({ name: 'previous_state', length: 20 })
  previousState: string;

  @Column({ name: 'action_taken', length: 100 })
  actionTaken: string;  // e.g. 'force_restart', 'recreate_service'

  @Column({ name: 'success', default: false })
  success: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}


