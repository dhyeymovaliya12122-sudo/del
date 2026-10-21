import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

export type VerificationStatus = 'not_started' | 'applied' | 'pending' | 'verified' | 'rejected';

@Entity('account_verifications')
export class VerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ type: 'varchar', length: 30, default: 'not_started' })
  status: VerificationStatus;

  @Column({ name: 'business_name', length: 200, nullable: true })
  businessName?: string;

  @Column({ name: 'business_id', length: 100, nullable: true })
  businessId?: string;

  @Column({ name: 'green_tick', default: false })
  greenTick: boolean;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({ name: 'docs_submitted', default: false })
  docsSubmitted: boolean;

  @Column({ name: 'meta_business_manager_linked', default: false })
  metaBusinessManagerLinked: boolean;

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
