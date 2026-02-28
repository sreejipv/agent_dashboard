// api/messages.js
import { getConfig } from './config.js';
import { getPool } from './db.js';
import { requireAuth } from './lib/auth.js';

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

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const config = getConfig();
    const { tenantId } = auth;

    const { rows: messages } = await getPool().query(
      'SELECT * FROM messages WHERE tenant_id = $1 ORDER BY timestamp DESC LIMIT 100',
      [tenantId]
    );

    // Format messages for the frontend
    const formattedMessages = (messages || []).map((msg, index) => {
      // Handle timestamp — stored as Unix int or derive from created_at
      let timestamp = msg.timestamp;
      if (!timestamp && msg.created_at) {
        timestamp = typeof msg.created_at === 'string'
          ? new Date(msg.created_at).getTime() / 1000
          : (msg.created_at instanceof Date ? msg.created_at.getTime() / 1000 : msg.created_at);
      }
      if (!timestamp) {
        timestamp = Date.now() / 1000;
      }

      // Extract message text from all possible column names
      let messageText = msg.message_text ||
                        msg.text ||
                        msg.body ||
                        msg.message ||
                        msg.content || '';

      // Check nested structure if direct fields are empty
      if (!messageText && msg.messages && Array.isArray(msg.messages) && msg.messages[0]) {
        const firstMsg = msg.messages[0];
        messageText = firstMsg.text?.body || firstMsg.text || firstMsg.body || '';
      }

      // Extract phone numbers
      let fromNumber = msg.from_number || msg.from || msg.phone_number || msg.sender || '';
      let toNumber   = msg.to_number   || msg.to   || msg.recipient   || msg.receiver || '';

      const messageStatus = msg.status || msg.message_status || 'received';
      const messageType   = msg.message_type || msg.type || 'text';

      const isSent = msg.is_sent === true ||
                     messageStatus === 'sent' ||
                     fromNumber === config.phoneNumberId ||
                     (msg.from_number && msg.from_number === config.phoneNumberId);

      return {
        id: msg.id || msg.message_id || `msg_${Date.now()}_${index}`,
        from: isSent ? config.phoneNumberId : (fromNumber || 'unknown'),
        to:   isSent ? (toNumber || 'unknown') : config.phoneNumberId,
        text: messageText,
        timestamp,
        type: messageType,
        status: messageStatus,
        isSent,
      };
    });

    return res.status(200).json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length,
    });

  } catch (error) {
    console.error('[messages] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
