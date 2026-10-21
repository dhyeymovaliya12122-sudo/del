import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('auto_reply_rules')
export class AutoReplyRuleEntity {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column()
  name: string;

  @Column({ name: 'trigger_type' })
  triggerType: 'keyword' | 'regex' | 'new_contact' | 'any' | 'contains';

  @Column({ name: 'trigger_value', type: 'text', nullable: true })
  triggerValue: string;

  @Column({ name: 'reply_message', type: 'text' })
  replyMessage: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'only_outside_hours', default: false })
  onlyOutsideHours: boolean;

  @Column({ name: 'business_hours_start', nullable: true })
  businessHoursStart: string; // "09:00"

  @Column({ name: 'business_hours_end', nullable: true })
  businessHoursEnd: string; // "18:00"

  @Column({ name: 'match_count', default: 0 })
  matchCount: number;

  @Column({ name: 'reply_count', default: 0 })
  replyCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
