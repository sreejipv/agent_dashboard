-- 002_create_users.sql
-- Creates the users table for agency admins.
-- Run SECOND, after tenants table exists.

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
