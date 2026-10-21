import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

@Entity('contact_groups')
export class ContactGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // JSON array of tag strings: ["city:Mumbai", "lang:Hindi", "interest:real-estate"]
  @Column({ type: 'text', default: '[]' })
  tags: string;

  @Column({ name: 'member_count', type: 'int', default: 0 })
  memberCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
