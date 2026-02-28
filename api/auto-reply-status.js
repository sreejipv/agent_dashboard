// api/auto-reply-status.js
// Check or update the global auto-reply (AI) toggle
import { getPool } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query(
        "SELECT value FROM settings WHERE key = 'auto_reply_enabled'"
      );

      if (rows.length > 0) {
        const enabled = rows[0].value === 'true' || rows[0].value === true;
        return res.status(200).json({ enabled });
      }

      return res.status(200).json({ enabled: false });
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
        `INSERT INTO settings (key, value)
         VALUES ('auto_reply_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [value]
      );

      return res.status(200).json({ success: true, enabled });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Auto-reply status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
