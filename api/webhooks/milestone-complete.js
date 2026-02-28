// api/webhooks/milestone-complete.js
// Called by your external client portal when a milestone is marked complete.
// Stores the event in RDS and optionally sends a WhatsApp notification to the client.
//
// Authentication: X-Webhook-Secret header must match WEBHOOK_SECRET env var.
//
// POST body:
// {
//   client_phone:    string,  // client's WhatsApp number
//   client_name:     string,  // for the notification message
//   milestone_title: string,  // e.g. "Design mockups approved"
//   notify_whatsapp: boolean, // optional, default false
//   tenant_slug:     string   // optional, defaults to 'fellocoder' for Phase 1
// }
import { getPool } from '../db.js';
import { getConfig } from '../config.js';
import { getTenantIdBySlug } from '../lib/tenant.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers['x-webhook-secret'] !== secret) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { client_phone, client_name, milestone_title, notify_whatsapp, tenant_slug } = req.body;

    if (!client_phone || !milestone_title) {
      return res.status(400).json({
        success: false,
        error: 'client_phone and milestone_title are required',
      });
    }

    // Resolve tenant — default to 'fellocoder' for Phase 1 backward compatibility
    const tenantId = await getTenantIdBySlug(tenant_slug || 'fellocoder');
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Unknown tenant' });
    }

    const now = new Date().toISOString();

    // Upsert milestone as complete
    const { rows } = await getPool().query(
      `INSERT INTO milestones (client_phone, title, status, completed_at, tenant_id)
       VALUES ($1, $2, 'complete', $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [client_phone, milestone_title, now, tenantId]
    );

    const milestoneId = rows[0]?.id;
    console.log(`[webhook/milestone-complete] Stored milestone "${milestone_title}" for ${client_phone}`);

    // Optionally send WhatsApp notification
    if (notify_whatsapp) {
      try {
        const config = getConfig();
        if (config.accessToken && config.phoneNumberId) {
          const name = client_name || client_phone;
          const messageBody = `Hi ${name}! Great news — your milestone "*${milestone_title}*" has been completed. Log in to your client portal to see the latest updates.`;

          const waRes = await fetch(
            `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: client_phone,
                type: 'text',
                text: { preview_url: false, body: messageBody },
              }),
            }
          );

          if (waRes.ok) {
            console.log(`[webhook/milestone-complete] WhatsApp notification sent to ${client_phone}`);
          } else {
            const err = await waRes.text();
            console.warn('[webhook/milestone-complete] WhatsApp notification failed:', err);
          }
        }
      } catch (notifyErr) {
        console.warn('[webhook/milestone-complete] Notification error (non-fatal):', notifyErr.message);
      }
    }

    return res.status(200).json({ success: true, milestone_id: milestoneId });

  } catch (error) {
    console.error('[webhook/milestone-complete] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
