import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

export enum ScheduleRepeat {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('scheduled_messages')
export class ScheduledMessageEntity {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ name: 'to_jid' })
  toJid: string;

  @Column({ name: 'message_text', type: 'text', nullable: true })
  messageText: string;

  @Column({ name: 'media_path', nullable: true })
  mediaPath: string;

  @Column({ name: 'media_type', nullable: true })
  mediaType: string;

  @Column({ name: 'caption', type: 'text', nullable: true })
  caption: string;

  @Column({ name: 'scheduled_at', type: 'datetime' })
  scheduledAt: Date;

  @Column({ name: 'repeat_type', default: ScheduleRepeat.ONCE })
  repeatType: ScheduleRepeat;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt: Date;

  @Column({ default: 'pending' })
  status: 'pending' | 'sent' | 'failed' | 'cancelled';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
