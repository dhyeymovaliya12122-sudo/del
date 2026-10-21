import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';

@Entity('campaigns')
export class CampaignEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'template_id', type: 'varchar', length: 100, nullable: true })
  templateId?: string;

  @Column({ name: 'contact_group_id', type: 'varchar', length: 100, nullable: true })
  contactGroupId?: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: CampaignStatus;

  @Column({ name: 'message_body', type: 'text', nullable: true })
  messageBody?: string;

  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl?: string;

  @Column({ name: 'media_type', length: 50, nullable: true })
  mediaType?: string;

  @Column({ name: 'scheduled_at', type: 'datetime', nullable: true })
  scheduledAt?: Date;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt?: Date;

  // Stats counters
  @Column({ name: 'total_recipients', type: 'int', default: 0 })
  totalRecipients: number;

  @Column({ name: 'sent_count', type: 'int', default: 0 })
  sentCount: number;

  @Column({ name: 'delivered_count', type: 'int', default: 0 })
  deliveredCount: number;

  @Column({ name: 'read_count', type: 'int', default: 0 })
  readCount: number;

  @Column({ name: 'replied_count', type: 'int', default: 0 })
  repliedCount: number;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'clicked_count', type: 'int', default: 0 })
  clickedCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
