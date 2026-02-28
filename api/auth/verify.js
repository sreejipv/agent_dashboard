// api/auth/verify.js
import { getAuthPayload } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = getAuthPayload(req);

  if (!payload) {
    return res.status(401).json({ success: false, authenticated: false });
  }

  return res.status(200).json({
    success: true,
    authenticated: true,
    tenantId:   payload.tenantId,
    tenantSlug: payload.tenantSlug,
    role:       payload.role,
    email:      payload.email,
  });
}
