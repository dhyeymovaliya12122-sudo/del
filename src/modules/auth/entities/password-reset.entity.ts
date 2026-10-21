import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('password_resets')
export class PasswordResetEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
