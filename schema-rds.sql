-- schema-rds.sql
-- Run this against your AWS RDS PostgreSQL instance to set up all tables.
-- Safe to run on a fresh database. Uses IF NOT EXISTS throughout.

-- ============================================================
-- EXISTING TABLES (migrated from Supabase, schema unchanged)
-- ============================================================

-- Messages: stores all WhatsApp messages (sent and received)
CREATE TABLE IF NOT EXISTS messages (
  id            VARCHAR(255)  PRIMARY KEY,
  from_number   VARCHAR(50),
  to_number     VARCHAR(50),
  message_text  TEXT,
  timestamp     BIGINT,                          -- Unix timestamp (seconds)
  message_type  VARCHAR(50)   DEFAULT 'text',
  status        VARCHAR(50)   DEFAULT 'received', -- received | sent
  is_sent       BOOLEAN       DEFAULT FALSE,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp  ON messages (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from       ON messages (from_number);
CREATE INDEX IF NOT EXISTS idx_messages_to         ON messages (to_number);

-- Conversations: per-contact settings (auto-reply toggle)
CREATE TABLE IF NOT EXISTS conversations (
  phone_number        VARCHAR(50)   PRIMARY KEY,
  auto_reply_enabled  BOOLEAN       DEFAULT FALSE,
  auto_reply_message  TEXT          DEFAULT 'Thank you for your message! We''ll get back to you soon.',
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

-- Settings: global key/value config store
CREATE TABLE IF NOT EXISTS settings (
  key    VARCHAR(255) PRIMARY KEY,
  value  TEXT         NOT NULL
);

-- Seed the auto-reply toggle (disabled by default)
INSERT INTO settings (key, value)
VALUES ('auto_reply_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- NEW TABLES
-- ============================================================

-- Magic links: single-use tokens for client portal access
CREATE TABLE IF NOT EXISTS magic_links (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  token        VARCHAR(255) UNIQUE NOT NULL,
  client_phone VARCHAR(50),
  client_name  VARCHAR(255),
  client_email VARCHAR(255),
  expires_at   TIMESTAMPTZ  NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token  ON magic_links (token);
CREATE INDEX IF NOT EXISTS idx_magic_links_phone  ON magic_links (client_phone);

-- Milestones: project milestones per client
CREATE TABLE IF NOT EXISTS milestones (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone VARCHAR(50)  NOT NULL,
  title        VARCHAR(500) NOT NULL,
  status       VARCHAR(50)  DEFAULT 'pending',  -- pending | complete
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_phone ON milestones (client_phone);

-- Client files: file references uploaded via external portal (stored in S3)
CREATE TABLE IF NOT EXISTS client_files (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone VARCHAR(50)  NOT NULL,
  file_name    VARCHAR(500) NOT NULL,
  file_url     TEXT         NOT NULL,
  uploaded_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_files_phone ON client_files (client_phone);
