// api/verify-phone.js
import { validateConfig } from './config.js';

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
    const config = validateConfig();

    const response = await fetch(
      `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}?fields=verified_name,code_verification_status,quality_rating`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to verify phone');
    }

    const data = await response.json();
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('Verify phone error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
