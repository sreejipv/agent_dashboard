// api/messages.js
import { getConfig } from './config.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = getConfig();
    
    // Check if Supabase is configured
    if (!config.supabaseUrl || !config.supabaseKey) {
      console.warn('Supabase not configured, returning empty messages array');
      return res.status(200).json({ 
        success: true, 
        messages: [],
        count: 0 
      });
    }

    // Initialize Supabase client
    const supabase = createClient(config.supabaseUrl, config.supabaseKey);

    // Fetch messages from Supabase
    // Assuming table name is 'messages' - adjust if different
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    // Format messages for the frontend
    const formattedMessages = (messages || []).map((msg, index) => {
      // Handle timestamp - convert Date to Unix timestamp if needed
      let timestamp = msg.timestamp;
      if (!timestamp && msg.created_at) {
        timestamp = typeof msg.created_at === 'string' 
          ? new Date(msg.created_at).getTime() / 1000 
          : (msg.created_at instanceof Date ? msg.created_at.getTime() / 1000 : msg.created_at);
      }
      if (!timestamp) {
        timestamp = Date.now() / 1000;
      }

      // Determine if message is sent (from us) or received (from customer)
      const fromNumber = msg.from || msg.from_number || msg.phone_number || '';
      const toNumber = msg.to || msg.to_number || msg.recipient || '';
      const messageText = msg.text || msg.body || msg.message || msg.content || '';
      const messageStatus = msg.status || msg.message_status || 'received';
      
      // If status is 'sent', it's from us; otherwise it's received
      const isSent = messageStatus === 'sent' || fromNumber === config.phoneNumberId;

      return {
        id: msg.id || msg.message_id || `msg_${Date.now()}_${index}`,
        from: isSent ? config.phoneNumberId : fromNumber,
        to: isSent ? toNumber : config.phoneNumberId,
        text: messageText,
        timestamp: timestamp,
      type: msg.type || 'text',
        status: messageStatus,
        isSent: isSent,
      };
    });

    return res.status(200).json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length 
    });

  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({
      success: false,
      error: error.message 
    });
  }
}
