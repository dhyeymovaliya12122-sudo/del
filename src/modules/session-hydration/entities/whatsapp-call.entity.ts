import {
  Entity, PrimaryColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('whatsapp_calls')
@Index(['accountId', 'timestamp'])
@Index(['callerJid', 'timestamp'])
@Index(['createdAt'])
export class WhatsappCallEntity {
  @PrimaryColumn({ length: 100 })
  id: string;

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Index()
  @Column({ name: 'caller_jid', length: 100 })
  callerJid: string;

  @Column({ name: 'caller_name', length: 150, nullable: true })
  callerName?: string;

  @Column({ length: 20, default: 'incoming' })
  direction: 'incoming' | 'outgoing';

  @Column({ length: 30, default: 'connected' })
  status: 'connected' | 'missed' | 'rejected' | 'never_attended' | 'not_pickup';

  @Column({ type: 'integer', default: 0 })
  duration: number; // in seconds

  @Column({ name: 'is_video', default: false })
  isVideo: boolean;

  @Column({ name: 'is_group', default: false })
  isGroup: boolean;

  @Index()
  @Column({ type: 'bigint', default: 0 })
  timestamp: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
