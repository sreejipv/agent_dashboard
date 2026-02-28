-- schema-rds.sql
-- Run this against your AWS RDS PostgreSQL instance to set up all tables.
-- Safe to run on a fresh database. Uses IF NOT EXISTS throughout.
--
-- For EXISTING databases, run the numbered migration files in sql/ instead:
--   sql/001_create_tenants.sql
--   sql/002_create_users.sql
--   sql/003_seed_fellocoder_user.sql
--   sql/004_add_tenant_id_to_existing_tables.sql
--   sql/005_backfill_fellocoder_tenant.sql

-- ============================================================
-- TENANTS (agencies using the platform)
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(100) UNIQUE,
  logo_url         VARCHAR(500),
  primary_color    VARCHAR(20),
  whatsapp_number  VARCHAR(20),
  whatsapp_creds   TEXT,        -- JSON: { accessToken, phoneNumberId } for Phase 2 per-tenant creds
  openai_key       TEXT,
  plan             VARCHAR(50)  DEFAULT 'agency',
  is_active        BOOLEAN      DEFAULT TRUE,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug            ON tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_whatsapp_number ON tenants (whatsapp_number);

-- Seed FelloCoder as the Phase 1 tenant
INSERT INTO tenants (name, slug, whatsapp_number)
VALUES ('FelloCoder', 'fellocoder', '852119087983190')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- USERS (agency admins — NOT end clients)
-- End clients access via magic link only, no users row needed.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  DEFAULT 'agency_admin',
                -- 'super_admin' | 'agency_admin' | 'team_member'
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);

-- ============================================================
-- MESSAGES: stores all WhatsApp messages (sent and received)
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id            VARCHAR(255)  PRIMARY KEY,
  from_number   VARCHAR(50),
  to_number     VARCHAR(50),
  message_text  TEXT,
  timestamp     BIGINT,                           -- Unix timestamp (seconds)
  message_type  VARCHAR(50)   DEFAULT 'text',
  status        VARCHAR(50)   DEFAULT 'received', -- received | sent
  is_sent       BOOLEAN       DEFAULT FALSE,
  tenant_id     UUID          REFERENCES tenants(id),
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp  ON messages (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from       ON messages (from_number);
CREATE INDEX IF NOT EXISTS idx_messages_to         ON messages (to_number);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id  ON messages (tenant_id);

-- ============================================================
-- CONVERSATIONS: per-contact settings (auto-reply toggle)
-- PK is composite (phone_number, tenant_id) for multi-tenant isolation.
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  phone_number        VARCHAR(50)   NOT NULL,
  tenant_id           UUID          NOT NULL REFERENCES tenants(id),
  auto_reply_enabled  BOOLEAN       DEFAULT FALSE,
  auto_reply_message  TEXT          DEFAULT 'Thank you for your message! We''ll get back to you soon.',
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW(),
  PRIMARY KEY (phone_number, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations (tenant_id);

-- ============================================================
-- SETTINGS: global key/value config store, scoped per tenant
-- PK is composite (key, tenant_id) for multi-tenant isolation.
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  key       VARCHAR(255) NOT NULL,
  value     TEXT         NOT NULL,
  tenant_id UUID         NOT NULL REFERENCES tenants(id),
  PRIMARY KEY (key, tenant_id)
);

-- Seed the auto-reply toggle for FelloCoder (disabled by default)
INSERT INTO settings (key, value, tenant_id)
SELECT 'auto_reply_enabled', 'false', t.id
FROM tenants t WHERE t.slug = 'fellocoder'
ON CONFLICT (key, tenant_id) DO NOTHING;

-- ============================================================
-- MAGIC LINKS: single-use tokens for client portal access
-- ============================================================

CREATE TABLE IF NOT EXISTS magic_links (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  token        VARCHAR(255) UNIQUE NOT NULL,
  client_phone VARCHAR(50),
  client_name  VARCHAR(255),
  client_email VARCHAR(255),
  expires_at   TIMESTAMPTZ  NOT NULL,
  used_at      TIMESTAMPTZ,
  tenant_id    UUID         REFERENCES tenants(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token     ON magic_links (token);
CREATE INDEX IF NOT EXISTS idx_magic_links_phone     ON magic_links (client_phone);
CREATE INDEX IF NOT EXISTS idx_magic_links_tenant_id ON magic_links (tenant_id);

-- ============================================================
-- MILESTONES: project milestones per client
-- ============================================================

CREATE TABLE IF NOT EXISTS milestones (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone VARCHAR(50)  NOT NULL,
  title        VARCHAR(500) NOT NULL,
  status       VARCHAR(50)  DEFAULT 'pending',  -- pending | complete
  completed_at TIMESTAMPTZ,
  tenant_id    UUID         REFERENCES tenants(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_phone     ON milestones (client_phone);
CREATE INDEX IF NOT EXISTS idx_milestones_tenant_id ON milestones (tenant_id);

-- ============================================================
-- CLIENT FILES: file references uploaded via external portal
-- ============================================================

CREATE TABLE IF NOT EXISTS client_files (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_phone VARCHAR(50)  NOT NULL,
  file_name    VARCHAR(500) NOT NULL,
  file_url     TEXT         NOT NULL,
  tenant_id    UUID         REFERENCES tenants(id),
  uploaded_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_files_phone     ON client_files (client_phone);
CREATE INDEX IF NOT EXISTS idx_client_files_tenant_id ON client_files (tenant_id);
