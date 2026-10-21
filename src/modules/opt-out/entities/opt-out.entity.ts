import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('opt_outs')
export class OptOutEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Index()
  @Column({ name: 'phone_number', length: 30 })
  phoneNumber: string;

  @Column({ length: 200, nullable: true })
  name?: string;

  @Column({ name: 'opt_out_reason', type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'opt_out_source', length: 50, default: 'manual' })
  source: string; // 'manual' | 'reply' | 'import'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
