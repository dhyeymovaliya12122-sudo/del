import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiFeatures1727000000001 implements MigrationInterface {
  name = 'AiFeatures1727000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS conversation_memory (
        id            TEXT PRIMARY KEY,
        account_id    TEXT NOT NULL,
        sender_jid    TEXT NOT NULL,
        summary       TEXT,
        key_facts     TEXT DEFAULT '{}',
        session_count INTEGER DEFAULT 0,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_memory_account_sender
      ON conversation_memory(account_id, sender_jid)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_conversation_memory_account_sender`);
    await queryRunner.query(`DROP TABLE IF EXISTS conversation_memory`);
  }
}
