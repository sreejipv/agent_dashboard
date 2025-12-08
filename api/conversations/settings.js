// api/conversations/settings.js
// Get or update conversation settings (like auto-reply enabled/disabled per contact)
import { getConfig } from '../config.js';

export default async function handler(req, res) {
  // Enable CORS
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
    const config = getConfig();
    
    if (!config.supabaseUrl || !config.supabaseKey) {
      console.warn('Supabase not configured');
      return res.status(200).json({
        success: true,
        settings: {
          auto_reply_enabled: false,
          auto_reply_message: "Thank you for your message! We'll get back to you soon.",
        },
      });
    }

    const SUPABASE_URL = config.supabaseUrl;
    const SUPABASE_KEY = config.supabaseKey;

    if (req.method === 'GET') {
      // Get settings for a specific contact
      const { contact } = req.query;

      if (!contact) {
        return res.status(400).json({
          success: false,
          error: 'Contact parameter is required',
        });
      }

      const supabaseUrl = `${SUPABASE_URL}/rest/v1/conversations?phone_number=eq.${encodeURIComponent(contact)}&select=*`;
      console.log('Fetching from Supabase:', supabaseUrl);
      
      const response = await fetch(supabaseUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Supabase response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Supabase error response:', errorText);
        // If table doesn't exist or no record, return default
        return res.status(200).json({
          success: true,
          settings: {
            phone_number: contact,
            auto_reply_enabled: false,
            auto_reply_message: "Thank you for your message! We'll get back to you soon.",
          },
        });
      }

      const data = await response.json();
      console.log('Supabase data:', data);
      
      if (data && data.length > 0) {
        console.log('Returning settings:', data[0]);
        return res.status(200).json({
          success: true,
          settings: data[0],
        });
      } else {
        // Return default if no record exists
        console.log('No settings found, returning default');
        return res.status(200).json({
          success: true,
          settings: {
            phone_number: contact,
            auto_reply_enabled: false,
            auto_reply_message: "Thank you for your message! We'll get back to you soon.",
          },
        });
      }
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      // Update or create settings for a contact
      const { phone_number, auto_reply_enabled, auto_reply_message } = req.body;

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          error: 'phone_number is required',
        });
      }

      // Check if record exists
      const checkUrl = `${SUPABASE_URL}/rest/v1/conversations?phone_number=eq.${encodeURIComponent(phone_number)}&select=phone_number`;
      console.log('Checking existing record:', checkUrl);
      
      const checkResponse = await fetch(checkUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });

      const existing = checkResponse.ok ? await checkResponse.json() : [];
      console.log('Existing record:', existing);

      const settingsData = {
        phone_number: phone_number,
        auto_reply_enabled: auto_reply_enabled !== undefined ? auto_reply_enabled : false,
        auto_reply_message: auto_reply_message || "Thank you for your message! We'll get back to you soon.",
        updated_at: new Date().toISOString(),
      };

      let response;
      if (existing && existing.length > 0) {
        // Update existing
        response = await fetch(
          `${SUPABASE_URL}/rest/v1/conversations?phone_number=eq.${encodeURIComponent(phone_number)}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(settingsData),
          }
        );
      } else {
        // Insert new
        settingsData.created_at = new Date().toISOString();
        response = await fetch(
          `${SUPABASE_URL}/rest/v1/conversations`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(settingsData),
          }
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save conversation settings:', response.status, errorText);
        
        // Check if table doesn't exist
        let errorMessage = `Failed to save settings: ${errorText}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message && errorJson.message.includes("Could not find the table")) {
            errorMessage = `Database table 'conversations' does not exist. Please create it in Supabase. See CONVERSATIONS_TABLE_SETUP.md or run the SQL in create_conversations_table.sql`;
          }
        } catch (e) {
          // Error text is not JSON, use as is
        }
        
        return res.status(500).json({
          success: false,
          error: errorMessage,
        });
      }

      const result = await response.json();
      console.log('Settings saved successfully:', result);
      return res.status(200).json({
        success: true,
        settings: Array.isArray(result) ? result[0] : result,
      });
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

