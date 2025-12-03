import { validateConfig } from './config.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const config = validateConfig();
    
    // Verify the phone number configuration
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}?fields=verified_name,code_verification_status,quality_rating,messaging_limit_tier`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.error?.message || `API Error: ${response.status}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        verified_name: data.verified_name,
        code_verification_status: data.code_verification_status,
        quality_rating: data.quality_rating,
        messaging_limit_tier: data.messaging_limit_tier,
      },
    });
  } catch (error) {
    console.error('Verify phone error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
