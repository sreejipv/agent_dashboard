// api/auto-reply-status.js
// Check or update the global auto-reply (AI) toggle, scoped per tenant.
import { getPool } from './db.js';
import { requireAuth } from './lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  const { tenantId } = auth;

  try {
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(
        "SELECT value FROM settings WHERE key = 'auto_reply_enabled' AND tenant_id = $1",
        [tenantId]
      );

      const enabled = rows.length > 0
        ? rows[0].value === 'true' || rows[0].value === true
        : false;

      return res.status(200).json({ enabled });
    }

    if (req.method === 'POST') {
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'enabled must be a boolean',
        });
      }

      const value = enabled ? 'true' : 'false';

      await pool.query(
        `INSERT INTO settings (key, value, tenant_id)
         VALUES ('auto_reply_enabled', $1, $2)
         ON CONFLICT (key, tenant_id) DO UPDATE SET value = EXCLUDED.value`,
        [value, tenantId]
      );

      return res.status(200).json({ success: true, enabled });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[auto-reply-status] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
