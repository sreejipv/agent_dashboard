// api/send-message.js
import { validateConfig, getConfig } from './config.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
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

    // Send message to WhatsApp
    const response = await fetch(
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to send message');
    }

    const data = await response.json();
    const messageId = data.messages[0].id;

    // Save message to Supabase
    try {
      const supabaseConfig = getConfig();
      if (supabaseConfig.supabaseUrl && supabaseConfig.supabaseKey) {
        const supabase = createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseKey);
        
        const insertData = {
          message_id: messageId,
          from_number: config.phoneNumberId, // Your phone number ID
          to_number: to,
          text: message,
          timestamp: Math.floor(Date.now() / 1000),
          type: 'text',
          status: 'sent'
        };

        const { data: insertedData, error: dbError } = await supabase
          .from('messages')
          .insert(insertData)
          .select();

        if (dbError) {
          console.error('Error saving message to database:', dbError);
          console.error('Insert data:', insertData);
          // Don't fail the request if DB save fails
        } else {
          console.log('Message saved successfully:', insertedData);
        }
      }
    } catch (dbErr) {
      console.error('Database save error:', dbErr);
      // Continue even if DB save fails
    }

    return res.status(200).json({
      success: true,
      data,
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
