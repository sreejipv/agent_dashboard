// api/send-message.js
import { validateConfig } from './config.js';
import { getPool } from './db.js';
import { requireAuth } from './lib/auth.js';

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
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to and message',
      });
    }

    const config = validateConfig();
    const { tenantId } = auth;

    // Send message via WhatsApp API
    console.log('[send-message] Sending WhatsApp message to:', to);
    const whatsappResponse = await fetch(
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
          to,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      }
    );

    if (!whatsappResponse.ok) {
      const errorData = await whatsappResponse.json();
      console.error('[send-message] WhatsApp API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to send message');
    }

    const whatsappData = await whatsappResponse.json();
    const messageId = whatsappData.messages[0].id;

    console.log('[send-message] Message sent successfully:', messageId);

    // Store sent message in RDS
    try {
      await getPool().query(
        `INSERT INTO messages (id, from_number, to_number, message_text, timestamp, message_type, status, is_sent, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          messageId,
          config.phoneNumberId,
          to,
          message,
          Math.floor(Date.now() / 1000),
          'text',
          'sent',
          true,
          tenantId,
        ]
      );
      console.log('[send-message] Message stored in RDS successfully');
    } catch (dbErr) {
      // Don't fail the request if storage fails — log and continue
      console.error('[send-message] Failed to store message in RDS:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      data: whatsappData,
      messageId,
    });

  } catch (error) {
    console.error('[send-message] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
