// api/portal/generate-link.js
// Admin-only: generate a magic link for a client to view their read-only portal.
// Requires a valid admin JWT cookie (same as the dashboard).
//
// POST body:
// {
//   client_phone: string,    // client's WhatsApp number (used to filter their data)
//   client_name:  string,    // display name in the portal
//   client_email: string     // optional — for reference only, no email is sent here
// }
//
// Response:
// { success: true, url: "https://your-domain.com/portal/<token>", token: "<token>" }
import { getPool } from '../db.js';
import { requireAuth } from '../lib/auth.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const { client_phone, client_name, client_email } = req.body;

    if (!client_phone) {
      return res.status(400).json({ success: false, error: 'client_phone is required' });
    }

    const magicToken = crypto.randomBytes(32).toString('hex');
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await getPool().query(
      `INSERT INTO magic_links (token, client_phone, client_name, client_email, expires_at, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [magicToken, client_phone, client_name || '', client_email || '', expiresAt, auth.tenantId]
    );

    const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const portalUrl = `${baseUrl}/portal/${magicToken}`;

    console.log(`[portal/generate-link] Created link for ${client_phone}: ${portalUrl}`);
    return res.status(200).json({ success: true, url: portalUrl, token: magicToken });

  } catch (error) {
    console.error('[portal/generate-link] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
