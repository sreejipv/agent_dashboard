-- 004_add_tenant_id_to_existing_tables.sql
-- Adds tenant_id FK to all existing data tables.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
-- Run AFTER tenants table is created and FelloCoder row inserted.
--
-- NOTE: This migration changes two primary keys:
--   conversations: phone_number PK → (phone_number, tenant_id) composite PK
--   settings:      key PK          → (key, tenant_id) composite PK
-- Deploy code changes to conversations/settings.js AFTER this migration runs.

-- messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- conversations: change PK from phone_number alone to (phone_number, tenant_id)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_pkey;

ALTER TABLE conversations
  ADD PRIMARY KEY (phone_number, tenant_id);

-- settings: change PK from key alone to (key, tenant_id)
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS settings_pkey;

ALTER TABLE settings
  ADD PRIMARY KEY (key, tenant_id);

-- magic_links
ALTER TABLE magic_links
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- milestones
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- client_files
ALTER TABLE client_files
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Performance indexes for tenant scoping
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id      ON messages      (tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations  (tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_tenant_id      ON settings       (tenant_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_tenant_id   ON magic_links    (tenant_id);
CREATE INDEX IF NOT EXISTS idx_milestones_tenant_id    ON milestones     (tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_files_tenant_id  ON client_files   (tenant_id);
