// api/auto-reply-status.js
// Simple endpoint to check if auto-reply (AI) is enabled globally
import { getConfig } from './config.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const config = getConfig();
    
    if (!config.supabaseUrl || !config.supabaseKey) {
      // Default to disabled if Supabase not configured
      return res.status(200).json({
        enabled: false,
      });
    }

    const SUPABASE_URL = config.supabaseUrl;
    const SUPABASE_KEY = config.supabaseKey;

    if (req.method === 'GET') {
      // Get current auto-reply status
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/settings?key=eq.auto_reply_enabled&select=value`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const enabled = data[0].value === 'true' || data[0].value === true;
          return res.status(200).json({
            enabled: enabled,
          });
        }
      }

      // Default to disabled if not found
      return res.status(200).json({
        enabled: false,
      });
    }

    if (req.method === 'POST') {
      // Update auto-reply status
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'enabled must be a boolean',
        });
      }

      // Check if record exists
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/settings?key=eq.auto_reply_enabled&select=key`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const existing = checkResponse.ok ? await checkResponse.json() : [];
      const value = enabled ? 'true' : 'false';

      let response;
      if (existing && existing.length > 0) {
        // Update existing
        response = await fetch(
          `${SUPABASE_URL}/rest/v1/settings?key=eq.auto_reply_enabled`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({ value: value }),
          }
        );
      } else {
        // Insert new
        response = await fetch(
          `${SUPABASE_URL}/rest/v1/settings`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({
              key: 'auto_reply_enabled',
              value: value,
            }),
          }
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save auto-reply status:', response.status, errorText);
        return res.status(500).json({
          success: false,
          error: `Failed to save status: ${errorText}`,
        });
      }

      return res.status(200).json({
        success: true,
        enabled: enabled,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Auto-reply status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}


