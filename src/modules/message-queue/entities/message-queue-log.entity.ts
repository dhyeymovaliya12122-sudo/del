// ─────────────────────────────────────────────────────────────────────────────
//  modules/message-queue/entities/message-queue-log.entity.ts
//  BullMQ job audit trail persisted to PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

export type QueueJobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

@Entity('message_queue_log')
export class MessageQueueLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', length: 100, unique: true })
  jobId: string;

  @Index()
  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId?: string;

  @Column({ name: 'queue_name', length: 100 })
  queueName: string;

  @Column({ name: 'job_type', length: 50 })
  jobType: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status: QueueJobStatus;

  @Column({ type: 'simple-json' })
  payload: object;

  @Column({ default: 0 })
  attempt: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true })
  processedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


