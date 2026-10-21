import {
  Entity, PrimaryColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('whatsapp_messages')
@Index(['accountId', 'chatJid'])                       // composite index for message queries
@Index(['accountId', 'timestamp'])                     // for ordering by time
@Index(['chatJid', 'timestamp'])                       // for single-chat queries
@Index(['accountId', 'chatJid', 'timestamp'])          // high-cardinality tri-column index for instant pagination
@Index(['createdAt', 'id'])                             // compound index for continuous FIFO and 180-day TTL eviction
export class WhatsappMessageEntity {
  @PrimaryColumn({ length: 100 })
  id: string; // WhatsApp message key ID

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Index()
  @Column({ name: 'chat_jid', length: 100 })
  chatJid: string; // remoteJid

  @Column({ name: 'sender_jid', length: 100, default: '' })
  senderJid: string;

  @Column({ name: 'sender_name', length: 150, nullable: true })
  senderName?: string;

  @Column({ name: 'from_me', default: false })
  fromMe: boolean;

  @Column({ type: 'text', default: '' })
  text: string;

  @Column({ name: 'media_type', length: 50, nullable: true })
  mediaType?: string;

  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl?: string;

  @Column({ name: 'file_name', length: 255, nullable: true })
  fileName?: string;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType?: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ length: 20, default: 'sent' })
  status: string; // 'sent' | 'delivered' | 'read' | 'failed'

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column({ name: 'is_view_once', default: false })
  isViewOnce: boolean;

  @Column({ name: 'is_edited', default: false })
  isEdited: boolean;

  @Column({ name: 'reaction', length: 50, nullable: true })
  reaction?: string;

  @Column({ name: 'is_starred', default: false })
  isStarred: boolean;

  @Column({ name: 'quoted_msg_id', length: 100, nullable: true })
  quotedMsgId?: string;

  @Column({ name: 'quoted_text', type: 'text', nullable: true })
  quotedText?: string;

  @Column({ name: 'quoted_sender', length: 150, nullable: true })
  quotedSender?: string;

  @Index()
  @Column({ type: 'bigint', default: 0 })
  timestamp: number;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

