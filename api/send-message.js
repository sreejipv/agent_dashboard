// api/send-message.js
import { validateConfig } from './config.js';

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

  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to and message' 
      });
    }

    const config = validateConfig();

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    // Send message to WhatsApp
    console.log('Sending WhatsApp message to:', to);
    const whatsappResponse = await fetch(
      `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      }
    );

    if (!whatsappResponse.ok) {
      const errorData = await whatsappResponse.json();
      console.error('WhatsApp API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to send message');
    }

    const whatsappData = await whatsappResponse.json();
    const messageId = whatsappData.messages[0].id;

    console.log('WhatsApp message sent successfully:', messageId);

    // Store sent message in Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      console.log('Storing message in database...');
      
      const messageRecord = {
        id: messageId,
        from_number: config.phoneNumberId,
        to_number: to,
        message_text: message,
        timestamp: Math.floor(Date.now() / 1000),
        message_type: 'text',
        status: 'sent',
        is_sent: true
      };

      const storeResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/messages`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(messageRecord)
        }
      );

      if (!storeResponse.ok) {
        const errorText = await storeResponse.text();
        console.error('Failed to store in Supabase:', errorText);
        // Don't fail the request if storage fails, but log it
      } else {
        console.log('Message stored in database successfully');
      }
    } else {
      console.warn('Supabase not configured - message not stored in database');
    }

    return res.status(200).json({ 
      success: true, 
      data: whatsappData,
      messageId: messageId
    });

  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
