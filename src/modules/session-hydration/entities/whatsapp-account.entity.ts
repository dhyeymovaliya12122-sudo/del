// ─────────────────────────────────────────────────────────────────────────────
//  modules/session-hydration/entities/whatsapp-account.entity.ts
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
import { SessionAuthEntity } from './session-auth.entity';

export type AccountStatus = 'pending' | 'active' | 'banned' | 'disconnected' | 'qr_pending';

@Entity('whatsapp_accounts')
export class WhatsappAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'phone_number', length: 20, unique: true })
  phoneNumber: string;

  @Column({ name: 'display_name', length: 100, nullable: true })
  displayName?: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: AccountStatus;

  @Column({ name: 'proxy_id', type: 'uuid', nullable: true })
  proxyId?: string;

  @OneToOne(() => SessionAuthEntity, (s) => s.account, { eager: false })
  session?: SessionAuthEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


