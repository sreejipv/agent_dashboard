-- 003_seed_fellocoder_user.sql
-- Seeds the initial admin user for FelloCoder.
--
-- BEFORE running this file:
-- Generate a bcrypt hash of your desired admin password:
--   node -e "const b=require('bcryptjs'); b.hash('YourPassword',10).then(h=>console.log(h))"
-- Then replace $2a$10$REPLACE_WITH_REAL_BCRYPT_HASH below with that output.

INSERT INTO users (tenant_id, name, email, password_hash, role)
SELECT
  t.id,
  'FelloCoder Admin',
  'admin@fellocoder.com',
  '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH',
  'agency_admin'
FROM tenants t
WHERE t.slug = 'fellocoder'
ON CONFLICT (email) DO NOTHING;
