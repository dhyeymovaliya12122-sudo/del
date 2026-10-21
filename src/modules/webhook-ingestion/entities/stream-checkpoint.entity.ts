// ─────────────────────────────────────────────────────────────────────────────
//  modules/webhook-ingestion/entities/stream-checkpoint.entity.ts
//  Tracks Redis Stream consumer group offsets for crash recovery.
//  On restart the consumer re-reads from the last committed offset.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('webhook_stream_checkpoint')
export class StreamCheckpointEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Redis Stream key (e.g. wa:webhooks:incoming) */
  @Column({ name: 'stream_key', length: 200, unique: true })
  streamKey: string;

  /** Consumer group name */
  @Column({ name: 'consumer_group', length: 100 })
  consumerGroup: string;

  /** Last acknowledged message ID from XACK */
  @Column({ name: 'last_ack_id', length: 50, default: '0' })
  lastAckId: string;

  /** Total messages processed since creation */
  @Column({ name: 'total_processed', type: 'bigint', default: 0 })
  totalProcessed: number;

  /** Total messages that ended up in dead-letter */
  @Column({ name: 'total_dead_lettered', type: 'bigint', default: 0 })
  totalDeadLettered: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


