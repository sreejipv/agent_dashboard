// api/conversations/settings.js
// Get or update per-conversation settings (auto-reply toggle per contact)
import { getPool } from '../db.js';

const DEFAULT_MESSAGE = "Thank you for your message! We'll get back to you soon.";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Conversation settings API called:', req.method, req.url);
  console.log('Query:', req.query);
  console.log('Body:', req.body);

  try {
    const pool = getPool();

    if (req.method === 'GET') {
      const { contact } = req.query;

      if (!contact) {
        return res.status(400).json({
          success: false,
          error: 'contact parameter is required',
        });
      }

      const { rows } = await pool.query(
        'SELECT * FROM conversations WHERE phone_number = $1',
        [contact]
      );

      if (rows.length > 0) {
        console.log('Returning settings:', rows[0]);
        return res.status(200).json({ success: true, settings: rows[0] });
      }

      console.log('No settings found, returning defaults');
      return res.status(200).json({
        success: true,
        settings: {
          phone_number: contact,
          auto_reply_enabled: false,
          auto_reply_message: DEFAULT_MESSAGE,
        },
      });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { phone_number, auto_reply_enabled, auto_reply_message } = req.body;

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          error: 'phone_number is required',
        });
      }

      const now = new Date().toISOString();
      const replyEnabled = auto_reply_enabled !== undefined ? auto_reply_enabled : false;
      const replyMessage = auto_reply_message || DEFAULT_MESSAGE;

      const { rows } = await pool.query(
        `INSERT INTO conversations (phone_number, auto_reply_enabled, auto_reply_message, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)
         ON CONFLICT (phone_number) DO UPDATE
           SET auto_reply_enabled = EXCLUDED.auto_reply_enabled,
               auto_reply_message = EXCLUDED.auto_reply_message,
               updated_at         = EXCLUDED.updated_at
         RETURNING *`,
        [phone_number, replyEnabled, replyMessage, now]
      );

      console.log('Settings saved successfully:', rows[0]);
      return res.status(200).json({ success: true, settings: rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Conversation settings error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
