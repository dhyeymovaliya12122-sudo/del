import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

export type RecipientStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | 'opted_out';

@Entity('campaign_recipients')
export class CampaignRecipientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'campaign_id', length: 100 })
  campaignId: string;

  @Index()
  @Column({ name: 'phone_number', length: 30 })
  phoneNumber: string;

  @Column({ length: 200, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: RecipientStatus;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt?: Date;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  readAt?: Date;

  @Column({ name: 'replied_at', type: 'datetime', nullable: true })
  repliedAt?: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
