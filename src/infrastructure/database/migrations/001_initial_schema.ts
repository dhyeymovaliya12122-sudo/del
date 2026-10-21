// -----------------------------------------------------------------------------
//  src/infrastructure/database/migrations/001_initial_schema.ts
//  [A-2 FIX] All CREATE TABLE / ALTER TABLE DDL extracted from AuthService.onModuleInit()
//  and placed here as a proper TypeORM migration.
//
//  This runs once automatically at boot (migrationsRun: true in database.module.ts).
//  It is fully idempotent — safe to re-run on existing databases.
// -----------------------------------------------------------------------------
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1727000000000 implements MigrationInterface {
  name = 'InitialSchema1727000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // -- Auth & Access tables --------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id           TEXT PRIMARY KEY,
        username     TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role         TEXT NOT NULL DEFAULT 'ADMIN',
        display_name TEXT NOT NULL,
        is_active    BOOLEAN NOT NULL DEFAULT 1,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_account_access (
        user_id    TEXT NOT NULL,
        account_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, account_id)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_account_access_account_id
      ON user_account_access(account_id)
    `);

    // -- Messaging & Automation tables -----------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id           TEXT PRIMARY KEY,
        account_id   TEXT NOT NULL,
        to_jid       TEXT NOT NULL,
        message_text TEXT,
        media_path   TEXT,
        media_type   TEXT,
        caption      TEXT,
        scheduled_at DATETIME NOT NULL,
        repeat_type  TEXT DEFAULT 'once',
        sent_at      DATETIME,
        status       TEXT DEFAULT 'pending',
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auto_reply_rules (
        id                   TEXT PRIMARY KEY,
        account_id           TEXT NOT NULL,
        name                 TEXT NOT NULL,
        trigger_type         TEXT NOT NULL,
        trigger_value        TEXT,
        reply_message        TEXT NOT NULL,
        is_active            BOOLEAN DEFAULT 1,
        only_outside_hours   BOOLEAN DEFAULT 0,
        business_hours_start TEXT,
        business_hours_end   TEXT,
        match_count          INTEGER DEFAULT 0,
        reply_count          INTEGER DEFAULT 0,
        created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // -- Campaign tables -------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id                TEXT PRIMARY KEY,
        account_id        TEXT NOT NULL,
        name              TEXT NOT NULL,
        template_id       TEXT,
        contact_group_id  TEXT,
        status            TEXT DEFAULT 'draft',
        message_body      TEXT,
        media_url         TEXT,
        media_type        TEXT,
        scheduled_at      DATETIME,
        started_at        DATETIME,
        completed_at      DATETIME,
        total_recipients  INTEGER DEFAULT 0,
        sent_count        INTEGER DEFAULT 0,
        delivered_count   INTEGER DEFAULT 0,
        read_count        INTEGER DEFAULT 0,
        replied_count     INTEGER DEFAULT 0,
        failed_count      INTEGER DEFAULT 0,
        clicked_count     INTEGER DEFAULT 0,
        created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id           TEXT PRIMARY KEY,
        campaign_id  TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        name         TEXT,
        status       TEXT DEFAULT 'pending',
        sent_at      DATETIME,
        delivered_at DATETIME,
        read_at      DATETIME,
        replied_at   DATETIME,
        error_reason TEXT,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // -- Media & Analytics tables ----------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS view_once_media (
        id                  TEXT PRIMARY KEY,
        account_id          TEXT NOT NULL,
        chat_jid            TEXT NOT NULL,
        sender_jid          TEXT NOT NULL,
        media_type          TEXT NOT NULL,
        local_path          TEXT NOT NULL,
        original_message_id TEXT,
        saved_at            DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS message_analytics (
        id          TEXT PRIMARY KEY,
        account_id  TEXT NOT NULL,
        message_id  TEXT NOT NULL,
        event_type  TEXT NOT NULL,
        contact_jid TEXT NOT NULL,
        campaign_id TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scheduled_statuses (
        id           TEXT PRIMARY KEY,
        account_id   TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content      TEXT NOT NULL,
        caption      TEXT,
        scheduled_at DATETIME NOT NULL,
        sent_at      DATETIME,
        status       TEXT DEFAULT 'pending'
      )
    `);

    // -- whatsapp_messages: ADD COLUMN (idempotent — errors are suppressed) ----
    //  SQLite has no IF NOT EXISTS for ADD COLUMN; each ALTER runs individually.
    const alterColumns: string[] = [
      `ALTER TABLE whatsapp_messages ADD COLUMN is_deleted    BOOLEAN DEFAULT 0`,
      `ALTER TABLE whatsapp_messages ADD COLUMN is_view_once  BOOLEAN DEFAULT 0`,
      `ALTER TABLE whatsapp_messages ADD COLUMN reaction       VARCHAR(20)`,
      `ALTER TABLE whatsapp_messages ADD COLUMN is_starred    BOOLEAN DEFAULT 0`,
      `ALTER TABLE whatsapp_messages ADD COLUMN quoted_msg_id VARCHAR(100)`,
      `ALTER TABLE whatsapp_messages ADD COLUMN quoted_text   TEXT`,
      `ALTER TABLE whatsapp_messages ADD COLUMN quoted_sender VARCHAR(100)`,
    ];

    for (const sql of alterColumns) {
      try {
        await queryRunner.query(sql);
      } catch {
        // Column already exists — safe to ignore in SQLite
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS scheduled_statuses`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_analytics`);
    await queryRunner.query(`DROP TABLE IF EXISTS view_once_media`);
    await queryRunner.query(`DROP TABLE IF EXISTS campaign_recipients`);
    await queryRunner.query(`DROP TABLE IF EXISTS campaigns`);
    await queryRunner.query(`DROP TABLE IF EXISTS auto_reply_rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS scheduled_messages`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_account_access_account_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_account_access`);
    await queryRunner.query(`DROP TABLE IF EXISTS app_users`);
  }
}
