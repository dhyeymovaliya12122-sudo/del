// ─────────────────────────────────────────────────────────────────────────────
//  modules/security-guard/entities/webhook-ingestion-log.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('webhook_ingestion_log')
export class WebhookIngestionLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId?: string;

  @Column({ name: 'event_type', length: 100 })
  eventType: string;

  @Column({ type: 'simple-json' })
  payload: object;

  @Column({ name: 'hmac_valid' })
  hmacValid: boolean;

  @Column({ name: 'source_ip', length: 45, nullable: true })
  sourceIp?: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;
}


