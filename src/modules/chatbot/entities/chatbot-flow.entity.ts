import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

@Entity('chatbot_flows')
export class ChatbotFlowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'trigger_keyword', length: 200, nullable: true })
  triggerKeyword?: string;

  @Column({ name: 'is_regex', default: false })
  isRegex: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // JSON array of flow nodes: [{id, type, data, position}]
  @Column({ type: 'text', default: '[]' })
  nodes: string;

  // JSON array of edges: [{id, source, target}]
  @Column({ type: 'text', default: '[]' })
  edges: string;

  @Column({ name: 'escalate_to_human', default: false })
  escalateToHuman: boolean;

  @Column({ name: 'escalate_message', type: 'text', nullable: true })
  escalateMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
