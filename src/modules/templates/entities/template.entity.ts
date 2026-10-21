import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

export type TemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type TemplateCategory = 'marketing' | 'utility' | 'authentication';

@Entity('message_templates')
export class TemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 30, default: 'marketing' })
  category: TemplateCategory;

  @Column({ length: 10, default: 'en' })
  language: string;

  // Template body with {{1}}, {{2}} placeholders
  @Column({ type: 'text' })
  body: string;

  // Optional header (text or media)
  @Column({ type: 'text', nullable: true })
  header?: string;

  @Column({ type: 'text', nullable: true })
  footer?: string;

  // JSON array of button objects: [{type: 'quick_reply', text: 'Yes'}]
  @Column({ type: 'text', default: '[]' })
  buttons: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: TemplateStatus;

  @Column({ name: 'meta_template_id', length: 100, nullable: true })
  metaTemplateId?: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'submitted_at', type: 'datetime', nullable: true })
  submittedAt?: Date;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
