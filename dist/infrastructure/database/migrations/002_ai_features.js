"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiFeatures1727000000001 = void 0;
class AiFeatures1727000000001 {
    constructor() {
        this.name = 'AiFeatures1727000000001';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_conversation_memory_account_sender`);
        await queryRunner.query(`DROP TABLE IF EXISTS conversation_memory`);
    }
}
exports.AiFeatures1727000000001 = AiFeatures1727000000001;
//# sourceMappingURL=002_ai_features.js.map