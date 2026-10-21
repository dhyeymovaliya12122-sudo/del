// ─────────────────────────────────────────────────────────────────────────────
//  src/modules/chatbot/entities/conversation-memory.entity.ts      [F-2]
//
//  Persists LLM-summarised facts per (accountId, senderJid) across sessions.
//  Enables: returning user personalisation, contact scoring, sentiment tracking.
//
//  Populated asynchronously by MemorySummariserWorker via BullMQ.
//  Zero latency impact on live conversations.
// ─────────────────────────────────────────────────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn, Index,
} from 'typeorm';

@Entity('conversation_memory')
@Index(['accountId', 'senderJid'], { unique: true })
export class ConversationMemoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', length: 100 })
  accountId: string;

  @Column({ name: 'sender_jid', length: 100 })
  senderJid: string;

  /** LLM-compressed 1-2 sentence summary of all prior sessions */
  @Column({ type: 'text', nullable: true })
  summary: string;

  /**
   * Structured facts extracted by MemorySummariserWorker.
   * Shape: { name, city, language, lastIntent, sentiment, customFields }
   * Stored as simple-json for cross-database (SQLite & PostgreSQL) compatibility.
   */
  @Column({ type: 'simple-json', default: '{}' })
  keyFacts: Record<string, any>;

  /** Increments on every session COMPLETED — used for contact scoring [F-12] */
  @Column({ name: 'session_count', type: 'int', default: 0 })
  sessionCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
