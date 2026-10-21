import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('user_account_access')
export class UserAccountAccessEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @Index('idx_user_account_access_account_id', { unique: true })
  @PrimaryColumn({ name: 'account_id' })
  accountId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

