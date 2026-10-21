import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

export type MigrationStatus = 'pending' | 'in_progress' | 'verified' | 'completed' | 'failed';

@Entity('account_migrations')
export class MigrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ name: 'source_phone_number', length: 30 })
  sourcePhoneNumber: string;

  @Column({ name: 'source_provider', length: 100, nullable: true })
  sourceProvider?: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: MigrationStatus;

  // Bitmask of completed steps: 1=contacts, 2=templates, 4=chat_history, 8=test_traffic, 16=cutover
  @Column({ name: 'steps_completed', type: 'int', default: 0 })
  stepsCompleted: number;

  @Column({ name: 'contacts_imported', type: 'int', default: 0 })
  contactsImported: number;

  @Column({ name: 'templates_imported', type: 'int', default: 0 })
  templatesImported: number;

  @Column({ name: 'messages_imported', type: 'int', default: 0 })
  messagesImported: number;

  @Column({ name: 'test_messages_sent', type: 'int', default: 0 })
  testMessagesSent: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
