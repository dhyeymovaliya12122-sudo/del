import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('whatsapp_chats')
@Index(['accountId', 'lastMessageTimestamp'])  // for sidebar sorting
export class WhatsappChatEntity {
  @PrimaryColumn({ length: 100 })
  id: string; // remoteJid (e.g. 123456789@s.whatsapp.net or 12345-67890@g.us)

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ length: 150, default: '' })
  name: string;

  @Column({ length: 255, nullable: true })
  subtitle?: string;

  @Column({ name: 'is_group', default: false })
  isGroup: boolean;

  @Column({ name: 'unread_count', default: 0 })
  unreadCount: number;

  @Column({ name: 'last_message_text', type: 'text', default: '' })
  lastMessageText: string;

  @Column({ name: 'last_message_timestamp', type: 'bigint', default: 0 })
  lastMessageTimestamp: number;

  @Column({ name: 'last_message_status', length: 20, default: 'sent' })
  lastMessageStatus: string;

  @Column({ name: 'last_message_from_me', default: false })
  lastMessageFromMe: boolean;

  @Column({ default: false })
  pinned: boolean;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
