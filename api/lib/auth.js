// api/lib/auth.js
// Shared authentication and tenant extraction utilities.
// All admin-facing API handlers should use requireAuth() before processing requests.

import jsonwebtoken from 'jsonwebtoken';
const { verify } = jsonwebtoken;
import cookiePkg from 'cookie';
const { parse } = cookiePkg;

/**
 * Verifies the admin_token cookie and returns the decoded JWT payload.
 * Returns null if missing, invalid, or if the token predates multi-tenant (no tenantId).
 *
 * Backward-compat shim: old tokens without tenantId are accepted during the transition
 * period using the FELLOCODER_TENANT_ID env var. Remove this shim once all sessions
 * have been refreshed (i.e. all users have logged in at least once after the migration).
 *
 * @param {import('http').IncomingMessage} req
 * @returns {{ userId?: string, tenantId: string, email?: string, role: string } | null}
 */
export function getAuthPayload(req) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.admin_token;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const decoded = verify(token, secret);

    // Backward-compat shim: old tokens only have { authenticated: true, timestamp }
    // Accept them during transition by falling back to the env-var tenant ID.
    if (!decoded.tenantId && decoded.authenticated === true) {
      const fallbackTenantId = process.env.FELLOCODER_TENANT_ID;
      if (!fallbackTenantId) return null;
      return {
        tenantId: fallbackTenantId,
        role: 'agency_admin',
      };
    }

    if (!decoded.tenantId) return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Guard for admin routes. Call at the top of any handler that requires authentication.
 * Sends a 401 response and returns null on failure; returns the auth payload on success.
 *
 * Usage:
 *   const auth = requireAuth(req, res);
 *   if (!auth) return;
 *   const { tenantId } = auth;
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {{ userId?: string, tenantId: string, email?: string, role: string } | null}
 */
export function requireAuth(req, res) {
  const payload = getAuthPayload(req);
  if (!payload) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return null;
  }
  return payload;
}
