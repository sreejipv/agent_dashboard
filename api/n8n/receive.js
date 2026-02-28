// api/n8n/receive.js
// Endpoint called by n8n to store incoming WhatsApp messages in RDS.
//
// Expected POST body from n8n:
// {
//   message_id: string,       // WhatsApp message ID
//   from:       string,       // sender phone number
//   to:         string,       // your business phone number
//   text:       string,       // message body
//   timestamp:  number,       // Unix timestamp (seconds)
//   type:       string        // "text" | "image" | etc.  (optional, default "text")
// }
import { getPool } from '../db.js';

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

  try {
    const { message_id, from, to, text, timestamp, type } = req.body;

    if (!from || !text) {
      return res.status(400).json({
        success: false,
        error: 'from and text are required',
      });
    }

    const id         = message_id || `n8n_${Date.now()}`;
    const ts         = timestamp  || Math.floor(Date.now() / 1000);
    const msgType    = type       || 'text';

    await getPool().query(
      `INSERT INTO messages (id, from_number, to_number, message_text, timestamp, message_type, status, is_sent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [id, from, to || '', text, ts, msgType, 'received', false]
    );

    console.log(`[n8n/receive] Stored message ${id} from ${from}`);
    return res.status(200).json({ success: true, id });

  } catch (error) {
    console.error('[n8n/receive] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
