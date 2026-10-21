-- ─────────────────────────────────────────────────────────────────────────────
--  infrastructure/database/init.sql
--  Initial schema — runs on first PostgreSQL container startup.
--  All WhatsApp auth payloads are stored AES-256-CBC encrypted.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Updated-at trigger function (declared first so all triggers can reference it) ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Proxy Pool ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proxy_pool (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  label         VARCHAR(100) NOT NULL,
  protocol      VARCHAR(10)  NOT NULL CHECK (protocol IN ('socks5', 'http', 'https')),
  host          VARCHAR(255) NOT NULL,
  port          INTEGER      NOT NULL,
  username      VARCHAR(100),
  password      VARCHAR(255),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  is_healthy    BOOLEAN      NOT NULL DEFAULT TRUE,
  last_health_check TIMESTAMPTZ,
  assigned_account_id UUID,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── WhatsApp Accounts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number  VARCHAR(20)  NOT NULL UNIQUE,
  display_name  VARCHAR(100),
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'banned', 'disconnected', 'qr_pending')),
  proxy_id      UUID         REFERENCES proxy_pool(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Session Auth Store ───────────────────────────────────────────────────────
--  Stores AES-256-CBC encrypted Baileys auth credentials.
--  Replaces EBS file storage — any container instance can hydrate from here.
CREATE TABLE IF NOT EXISTS session_auth_store (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID         NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  encrypted_creds TEXT         NOT NULL,  -- AES-256-CBC encrypted JSON
  encrypted_keys  TEXT,                   -- AES-256-CBC encrypted pre-keys blob
  iv              VARCHAR(64)  NOT NULL,  -- Initialization vector (hex)
  version         INTEGER      NOT NULL DEFAULT 1,
  checksum        VARCHAR(64)  NOT NULL,  -- SHA-256 of plaintext for integrity check
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  expires_at      TIMESTAMPTZ,
  hydrated_at     TIMESTAMPTZ,            -- Last time a container fetched this
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);

-- ─────────────────────────────────────────── PHASE 2 TABLES ─────────────────

-- ── Media Objects  (Cloudflare R2 references) ────────────────────────────────
--  Inbound media is streamed directly to R2. This table stores the CDN links.
CREATE TABLE IF NOT EXISTS media_objects (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id        UUID         REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  message_id        VARCHAR(100) NOT NULL,
  media_type        VARCHAR(20)  NOT NULL CHECK (media_type IN ('image','audio','video','document','sticker')),
  original_filename VARCHAR(255),
  mime_type         VARCHAR(100),
  file_size_bytes   BIGINT,
  r2_key            VARCHAR(500) NOT NULL UNIQUE,  -- Object key in R2 bucket
  cdn_url           TEXT,                           -- Public CDN URL
  presigned_url     TEXT,                           -- Temporary presigned URL
  presigned_url_expiry TIMESTAMPTZ,
  checksum_sha256   VARCHAR(64),                    -- Integrity check
  is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Message Queue Log  (BullMQ job audit trail) ───────────────────────────────
CREATE TABLE IF NOT EXISTS message_queue_log (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          VARCHAR(100) NOT NULL UNIQUE,
  account_id      UUID         REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  queue_name      VARCHAR(100) NOT NULL,
  job_type        VARCHAR(50)  NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','active','completed','failed','delayed','paused')),
  payload         JSONB        NOT NULL,
  attempt         INTEGER      NOT NULL DEFAULT 0,
  error_message   TEXT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Proxy Circuit Breaker State  (snapshot of Redis CB state) ─────────────────
CREATE TABLE IF NOT EXISTS proxy_circuit_breaker_state (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  proxy_id        UUID         NOT NULL REFERENCES proxy_pool(id) ON DELETE CASCADE,
  account_id      UUID         REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  state           VARCHAR(10)  NOT NULL CHECK (state IN ('CLOSED','OPEN','HALF_OPEN')),
  failure_count   INTEGER      NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  reset_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(proxy_id)
);

-- ── Phase 2 Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_media_account ON media_objects(account_id);
CREATE INDEX IF NOT EXISTS idx_media_message ON media_objects(message_id);
CREATE INDEX IF NOT EXISTS idx_queue_log_account ON message_queue_log(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_log_status ON message_queue_log(status);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_proxy ON proxy_circuit_breaker_state(proxy_id);

CREATE TRIGGER trg_queue_log_updated
  BEFORE UPDATE ON message_queue_log
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_circuit_breaker_updated
  BEFORE UPDATE ON proxy_circuit_breaker_state
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─────────────────────────────────────────── END PHASE 2 ─────────────────────

-- ── Webhook Ingestion Log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_ingestion_log (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID         REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB        NOT NULL,
  hmac_valid      BOOLEAN      NOT NULL,
  source_ip       VARCHAR(45),
  processed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_session_auth_account ON session_auth_store(account_id);
CREATE INDEX IF NOT EXISTS idx_session_auth_active ON session_auth_store(is_active);
CREATE INDEX IF NOT EXISTS idx_proxy_pool_active ON proxy_pool(is_active, is_healthy);
CREATE INDEX IF NOT EXISTS idx_proxy_pool_account ON proxy_pool(assigned_account_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_account ON webhook_ingestion_log(account_id, processed_at);

CREATE TRIGGER trg_whatsapp_accounts_updated
  BEFORE UPDATE ON whatsapp_accounts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_session_auth_updated
  BEFORE UPDATE ON session_auth_store
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_proxy_pool_updated
  BEFORE UPDATE ON proxy_pool
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─────────────────────────────────────────── PHASE 3 TABLES ─────────────────

-- ── Container Instances (orchestrated WhatsApp engines) ──────────────────────
CREATE TABLE IF NOT EXISTS container_instances (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id          VARCHAR(100) NOT NULL UNIQUE,   -- Docker service ID or Coolify app UUID
  account_id          VARCHAR(36) NOT NULL,
  tenant_id           VARCHAR(36) NOT NULL,
  phone_number        VARCHAR(20) NOT NULL,
  orchestrator_type   VARCHAR(20) NOT NULL DEFAULT 'swarm',
  status              VARCHAR(20) NOT NULL DEFAULT 'starting'
                      CHECK (status IN ('starting','running','stopping','stopped','failed')),
  health_state        VARCHAR(20) NOT NULL DEFAULT 'unknown'
                      CHECK (health_state IN ('healthy','unhealthy','unknown')),
  desired_replicas    INTEGER     NOT NULL DEFAULT 1,
  running_replicas    INTEGER     NOT NULL DEFAULT 0,
  region              VARCHAR(50),
  proxy_url           VARCHAR(500),
  heal_count          INTEGER     NOT NULL DEFAULT 0,
  last_healed_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Container Auto-Heal Log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS container_heal_log (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  container_instance_id   UUID        REFERENCES container_instances(id) ON DELETE CASCADE,
  account_id              VARCHAR(36) NOT NULL,
  heal_reason             VARCHAR(200) NOT NULL,
  previous_state          VARCHAR(20) NOT NULL,
  action_taken            VARCHAR(100) NOT NULL,
  success                 BOOLEAN     NOT NULL DEFAULT FALSE,
  error_message           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Redis Stream Checkpoint (consumer group offset tracking) ─────────────────
CREATE TABLE IF NOT EXISTS webhook_stream_checkpoint (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_key          VARCHAR(200) NOT NULL UNIQUE,
  consumer_group      VARCHAR(100) NOT NULL,
  last_ack_id         VARCHAR(50) NOT NULL DEFAULT '0',
  total_processed     BIGINT      NOT NULL DEFAULT 0,
  total_dead_lettered BIGINT      NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Phase 3 Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_container_account ON container_instances(account_id);
CREATE INDEX IF NOT EXISTS idx_container_tenant ON container_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_container_status ON container_instances(status, health_state);
CREATE INDEX IF NOT EXISTS idx_heal_log_instance ON container_heal_log(container_instance_id);

CREATE TRIGGER trg_container_instances_updated
  BEFORE UPDATE ON container_instances
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_stream_checkpoint_updated
  BEFORE UPDATE ON webhook_stream_checkpoint
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─────────────────────────────────────────── END PHASE 3 ─────────────────────
