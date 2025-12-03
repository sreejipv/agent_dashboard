// Fetch messages from your database
// This assumes you're storing messages in a database accessible via environment variables
// You'll need to configure your database connection based on what you're using

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // TODO: Replace this with your actual database connection
    // Examples for different databases:
    
    // Option 1: Vercel KV (Redis)
    // const { kv } = await import('@vercel/kv');
    // const messages = await kv.lrange('whatsapp:messages', 0, -1);
    
    // Option 2: MongoDB
    // const { MongoClient } = await import('mongodb');
    // const client = new MongoClient(process.env.MONGODB_URI);
    // await client.connect();
    // const db = client.db();
    // const messages = await db.collection('messages').find({}).sort({ timestamp: -1 }).toArray();
    
    // Option 3: PostgreSQL
    // const { Pool } = await import('pg');
    // const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
    // const result = await pool.query('SELECT * FROM messages ORDER BY timestamp DESC');
    // const messages = result.rows;
    
    // Option 4: Fetch from n8n webhook endpoint (if n8n exposes an API)
    // const n8nApiUrl = process.env.N8N_API_URL;
    // const response = await fetch(`${n8nApiUrl}/messages`);
    // const data = await response.json();
    // const messages = data.messages || [];

    // For now, return empty array until database is configured
    // Replace this section with your actual database query
    const messages = [];

    // Format messages for the frontend
    const formattedMessages = messages.map((msg) => ({
      id: msg.id || msg._id || `msg_${Date.now()}`,
      from: msg.from || msg.from_number,
      to: msg.to || msg.to_number,
      text: msg.text || msg.body || msg.message,
      timestamp: msg.timestamp || msg.created_at || Date.now() / 1000,
      type: msg.type || 'text',
      status: msg.status || 'received',
    }));

    return res.status(200).json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length,
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      messages: [], // Return empty array on error
    });
  }
}
