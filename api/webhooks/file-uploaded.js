// api/webhooks/file-uploaded.js
// Called by your external client portal when a file is uploaded (e.g. to S3).
// Stores the file reference in RDS and optionally sends a WhatsApp notification.
//
// Authentication: X-Webhook-Secret header must match WEBHOOK_SECRET env var.
//
// POST body:
// {
//   client_phone:    string,  // client's WhatsApp number
//   client_name:     string,  // for the notification message
//   file_name:       string,  // display name e.g. "invoice-march.pdf"
//   file_url:        string,  // publicly accessible URL (S3 pre-signed or public)
//   notify_whatsapp: boolean  // optional, default false
// }
import { getPool } from '../db.js';
import { getConfig } from '../config.js';

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
    const { client_phone, client_name, file_name, file_url, notify_whatsapp } = req.body;

    if (!client_phone || !file_name || !file_url) {
      return res.status(400).json({
        success: false,
        error: 'client_phone, file_name, and file_url are required',
      });
    }

    // Store file reference
    const { rows } = await getPool().query(
      `INSERT INTO client_files (client_phone, file_name, file_url)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [client_phone, file_name, file_url]
    );

    const fileId = rows[0]?.id;
    console.log(`[webhook/file-uploaded] Stored file "${file_name}" for ${client_phone}`);

    // Optionally send WhatsApp notification
    if (notify_whatsapp) {
      try {
        const config = getConfig();
        if (config.accessToken && config.phoneNumberId) {
          const name = client_name || client_phone;
          const messageBody = `Hi ${name}! 📁 A new file has been uploaded to your project: *${file_name}*. You can view and download it from your client portal.`;

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
            console.log(`[webhook/file-uploaded] WhatsApp notification sent to ${client_phone}`);
          } else {
            const err = await waRes.text();
            console.warn('[webhook/file-uploaded] WhatsApp notification failed:', err);
          }
        }
      } catch (notifyErr) {
        console.warn('[webhook/file-uploaded] Notification error (non-fatal):', notifyErr.message);
      }
    }

    return res.status(200).json({ success: true, file_id: fileId });

  } catch (error) {
    console.error('[webhook/file-uploaded] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
