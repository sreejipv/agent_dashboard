// api/portal/verify-link.js
// Validates a magic link token and returns all client data for the portal view.
// This is stateless — it does NOT mark the token as used so clients can reload.
//
// GET ?token=<hex-token>
//
// Response:
// {
//   success: true,
//   client_phone: string,
//   client_name:  string,
//   messages:     Message[],
//   milestones:   Milestone[],
//   files:        ClientFile[]
// }
import { getPool } from '../db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, error: 'token is required' });
  }

  try {
    const pool = getPool();

    // Validate token
    const { rows: linkRows } = await pool.query(
      'SELECT * FROM magic_links WHERE token = $1',
      [token]
    );

    if (linkRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Link not found' });
    }

    const link = linkRows[0];

    if (new Date() > new Date(link.expires_at)) {
      return res.status(410).json({ success: false, error: 'Link has expired' });
    }

    const { client_phone, client_name, tenant_id } = link;

    // Fetch all client data in parallel, scoped to the tenant from the magic link
    const [messagesResult, milestonesResult, filesResult] = await Promise.all([
      pool.query(
        `SELECT id, from_number, to_number, message_text AS text, timestamp, message_type AS type, status, is_sent
         FROM messages
         WHERE (from_number = $1 OR to_number = $1) AND tenant_id = $2
         ORDER BY timestamp ASC`,
        [client_phone, tenant_id]
      ),
      pool.query(
        'SELECT id, title, status, completed_at, created_at FROM milestones WHERE client_phone = $1 AND tenant_id = $2 ORDER BY created_at ASC',
        [client_phone, tenant_id]
      ),
      pool.query(
        'SELECT id, file_name, file_url, uploaded_at FROM client_files WHERE client_phone = $1 AND tenant_id = $2 ORDER BY uploaded_at DESC',
        [client_phone, tenant_id]
      ),
    ]);

    return res.status(200).json({
      success: true,
      client_phone,
      client_name,
      messages:   messagesResult.rows,
      milestones: milestonesResult.rows,
      files:      filesResult.rows,
    });

  } catch (error) {
    console.error('[portal/verify-link] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
