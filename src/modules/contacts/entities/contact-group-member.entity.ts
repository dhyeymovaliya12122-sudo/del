import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

@Entity('contact_group_members')
export class ContactGroupMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'group_id', length: 100 })
  groupId: string;

  @Index()
  @Column({ name: 'phone_number', length: 30 })
  phoneNumber: string;

  @Column({ length: 200, nullable: true })
  name?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 50, nullable: true })
  language?: string;

  // JSON object for custom fields: {"company": "Acme", "plan": "premium"}
  @Column({ name: 'custom_fields', type: 'text', default: '{}' })
  customFields: string;

  // JSON array of tags
  @Column({ type: 'text', default: '[]' })
  tags: string;

  @Column({ name: 'opted_out', default: false })
  optedOut: boolean;

  @Column({ name: 'opted_out_at', type: 'datetime', nullable: true })
  optedOutAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
