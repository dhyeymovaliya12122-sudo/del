// ─────────────────────────────────────────────────────────────────────────────
//  modules/media-pipeline/entities/media-object.entity.ts
//  Stores Cloudflare R2 object references (CDN URL + presigned URL)
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { WhatsappAccountEntity } from '../../session-hydration/entities/whatsapp-account.entity';

export type MediaType = 'image' | 'audio' | 'video' | 'document' | 'sticker';

@Entity('media_objects')
export class MediaObjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId?: string;

  @ManyToOne(() => WhatsappAccountEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'account_id' })
  account?: WhatsappAccountEntity;

  @Index()
  @Column({ name: 'message_id', length: 100 })
  messageId: string;

  @Column({ name: 'media_type', type: 'varchar', length: 20 })
  mediaType: MediaType;

  @Column({ name: 'original_filename', length: 255, nullable: true })
  originalFilename?: string;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType?: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes?: number;

  /** Object key path inside the R2 bucket: <accountId>/<date>/<uuid>.<ext> */
  @Column({ name: 'r2_key', length: 500, unique: true })
  r2Key: string;

  /** Public CDN URL (only set if bucket is public or domain-bound) */
  @Column({ name: 'cdn_url', type: 'text', nullable: true })
  cdnUrl?: string;

  /** Temporary presigned URL for private access */
  @Column({ name: 'presigned_url', type: 'text', nullable: true })
  presignedUrl?: string;

  @Column({ name: 'presigned_url_expiry', type: 'datetime', nullable: true })
  presignedUrlExpiry?: Date;

  /** SHA-256 hash of the original file for integrity verification */
  @Column({ name: 'checksum_sha256', length: 64, nullable: true })
  checksumSha256?: string;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}


