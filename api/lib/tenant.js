// api/lib/tenant.js
// Tenant resolution helpers for contexts that don't have a JWT
// (e.g. incoming webhooks from n8n, which authenticate by WhatsApp phone number).

import { getPool } from '../db.js';

/**
 * Resolves a tenant by the WhatsApp business phone number the message was sent TO.
 * Used by api/n8n/receive.js and any future inbound webhook.
 *
 * @param {string} whatsappNumber - The 'to' number from the incoming WA payload
 * @returns {Promise<string|null>} tenant UUID or null if not found
 */
export async function getTenantIdByWhatsAppNumber(whatsappNumber) {
  if (!whatsappNumber) return null;
  const { rows } = await getPool().query(
    'SELECT id FROM tenants WHERE whatsapp_number = $1 AND is_active = TRUE',
    [whatsappNumber]
  );
  return rows[0]?.id ?? null;
}

/**
 * Resolves a tenant UUID from a slug string.
 * Used by webhook handlers that receive tenant_slug in their POST body.
 * Defaults to 'fellocoder' for Phase 1 backward compatibility.
 *
 * @param {string} slug - tenant slug (e.g. 'fellocoder')
 * @returns {Promise<string|null>} tenant UUID or null if not found
 */
export async function getTenantIdBySlug(slug) {
  const { rows } = await getPool().query(
    'SELECT id FROM tenants WHERE slug = $1 AND is_active = TRUE',
    [slug]
  );
  return rows[0]?.id ?? null;
}
