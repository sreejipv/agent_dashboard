-- 001_create_tenants.sql
-- Creates the tenants table and seeds FelloCoder as the sole Phase 1 tenant.
-- Run FIRST before any other migration.

CREATE TABLE IF NOT EXISTS tenants (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  slug             VARCHAR(100) UNIQUE,
  logo_url         VARCHAR(500),
  primary_color    VARCHAR(20),
  whatsapp_number  VARCHAR(20),
  whatsapp_creds   TEXT,        -- JSON blob: { accessToken, phoneNumberId } for Phase 2
  openai_key       TEXT,
  plan             VARCHAR(50)  DEFAULT 'agency',
  is_active        BOOLEAN      DEFAULT TRUE,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug            ON tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_whatsapp_number ON tenants (whatsapp_number);

-- Seed FelloCoder (Phase 1 only tenant)
INSERT INTO tenants (name, slug, whatsapp_number)
VALUES ('FelloCoder', 'fellocoder', '852119087983190')
ON CONFLICT (slug) DO NOTHING;
