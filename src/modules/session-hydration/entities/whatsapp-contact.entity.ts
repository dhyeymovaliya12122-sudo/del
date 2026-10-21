import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('whatsapp_contacts')
export class WhatsappContactEntity {
  @PrimaryColumn({ length: 100 })
  id: string; // JID (e.g. 123456789@s.whatsapp.net)

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ name: 'phone_number', length: 50, default: '' })
  phoneNumber: string;

  @Column({ length: 150, default: '' })
  name: string;

  @Column({ name: 'notify_name', length: 150, default: '' })
  notifyName: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
