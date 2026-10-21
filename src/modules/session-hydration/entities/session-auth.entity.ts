// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/entities/session-auth.entity.ts
//  TypeORM entity for the session_auth_store table.
//  Stores AES-256-CBC encrypted Baileys credentials and pre-keys.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { WhatsappAccountEntity } from './whatsapp-account.entity';

@Entity('session_auth_store')
export class SessionAuthEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => WhatsappAccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: WhatsappAccountEntity;

  /** AES-256-CBC encrypted Baileys creds.json content */
  @Column({ name: 'encrypted_creds', type: 'text' })
  encryptedCreds: string;

  /** AES-256-CBC encrypted pre-keys blob (optional) */
  @Column({ name: 'encrypted_keys', type: 'text', nullable: true })
  encryptedKeys?: string;

  /** Hex-encoded IV used during encryption */
  @Column({ name: 'iv', length: 64 })
  iv: string;

  /** Schema version for forward-compat migration */
  @Column({ name: 'version', default: 1 })
  version: number;

  /** SHA-256 of the original plaintext — integrity verification */
  @Column({ name: 'checksum', length: 64 })
  checksum: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt?: Date;

  /** Timestamp of last container hydration */
  @Column({ name: 'hydrated_at', type: 'datetime', nullable: true })
  hydratedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


