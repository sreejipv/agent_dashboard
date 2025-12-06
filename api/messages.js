// api/messages.js
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
    // TODO: Connect to your database (MongoDB, PostgreSQL, etc.)
    // For now, return empty array
    // In production, fetch messages from your database that n8n stores
    
    const messages = [
      // Example format:
      // {
      //   id: 'msg_123',
      //   from: '919876543210',
      //   to: 'your_phone_id',
      //   text: 'Hello!',
      //   timestamp: Date.now() / 1000,
      //   type: 'text',
      //   status: 'received'
      // }
    ];

    return res.status(200).json({ 
      success: true, 
      messages,
      count: messages.length 
    });

  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
