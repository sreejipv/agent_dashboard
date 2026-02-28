-- 005_backfill_fellocoder_tenant.sql
-- Backfills all existing rows with the FelloCoder tenant_id.
-- Run AFTER migration 004.
--
-- Verify completion after running:
--   SELECT 'messages'      AS tbl, COUNT(*) FROM messages      WHERE tenant_id IS NULL
--   UNION ALL
--   SELECT 'conversations' AS tbl, COUNT(*) FROM conversations WHERE tenant_id IS NULL
--   UNION ALL
--   SELECT 'settings'      AS tbl, COUNT(*) FROM settings       WHERE tenant_id IS NULL
--   UNION ALL
--   SELECT 'magic_links'   AS tbl, COUNT(*) FROM magic_links    WHERE tenant_id IS NULL
--   UNION ALL
--   SELECT 'milestones'    AS tbl, COUNT(*) FROM milestones     WHERE tenant_id IS NULL
--   UNION ALL
--   SELECT 'client_files'  AS tbl, COUNT(*) FROM client_files   WHERE tenant_id IS NULL;
-- All counts should be 0.

DO $$
DECLARE
  fello_id UUID;
BEGIN
  SELECT id INTO fello_id FROM tenants WHERE slug = 'fellocoder';

  IF fello_id IS NULL THEN
    RAISE EXCEPTION 'FelloCoder tenant not found. Run 001_create_tenants.sql first.';
  END IF;

  UPDATE messages      SET tenant_id = fello_id WHERE tenant_id IS NULL;
  UPDATE conversations SET tenant_id = fello_id WHERE tenant_id IS NULL;
  UPDATE settings      SET tenant_id = fello_id WHERE tenant_id IS NULL;
  UPDATE magic_links   SET tenant_id = fello_id WHERE tenant_id IS NULL;
  UPDATE milestones    SET tenant_id = fello_id WHERE tenant_id IS NULL;
  UPDATE client_files  SET tenant_id = fello_id WHERE tenant_id IS NULL;

  RAISE NOTICE 'Backfill complete for tenant_id: %', fello_id;
END $$;
