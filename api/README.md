# Vercel API Functions for WhatsApp Admin Panel

This directory contains serverless API functions for the WhatsApp Admin Panel.

## Minimal Setup (Recommended to Start)

### Quick Start - Just Sending Messages

**You only need ONE file: `api/send-message.js`**

This allows you to:
- ✅ Send WhatsApp messages from the admin panel
- ✅ Works with your existing n8n webhook setup
- ⚠️ Viewing messages: You'll only see messages you send (incoming messages go to n8n)

### 1. Environment Variables

Set these in your Vercel project (Settings → Environment Variables):

- `WHATSAPP_ACCESS_TOKEN` - Your Meta access token
- `WHATSAPP_PHONE_ID` - Your WhatsApp phone number ID

### 2. Deploy

```bash
git add api/send-message.js
git commit -m "Add send message API"
git push
```

That's it! You can now send messages from the admin panel.

---

## Full Setup (Optional - For Viewing Messages)

### Database Configuration (for messages.js)

Since you're using n8n for webhooks, you'll need to configure a database connection in `api/messages.js` based on your setup:

**Option A: If n8n stores messages in a database**

- Configure the database connection in `api/messages.js`
- Update the query to fetch from your database

**Option B: If n8n exposes an API endpoint**

- Set `N8N_API_URL` environment variable
- Uncomment the fetch code in `api/messages.js`

**Option C: Use Vercel KV (Redis)**

- Add Vercel KV to your project
- Uncomment the KV code in `api/messages.js`

## API Endpoints

### GET /api/verify-phone

Verifies WhatsApp phone number connection.

**Response:**

```json
{
  "success": true,
  "data": {
    "verified_name": "Your Business Name",
    "code_verification_status": "VERIFIED",
    "quality_rating": "GREEN",
    "messaging_limit_tier": "TIER_1000"
  }
}
```

### POST /api/send-message

Sends a WhatsApp message.

**Request Body:**

```json
{
  "to": "1234567890",
  "message": "Hello, this is a test message"
}
```

**Response:**

```json
{
  "success": true,
  "messageId": "wamid.xxx",
  "data": { ... }
}
```

### GET /api/messages

Fetches stored messages from database.

**Response:**

```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "from": "1234567890",
      "to": "your_phone_id",
      "text": "Hello",
      "timestamp": 1234567890,
      "type": "text",
      "status": "received"
    }
  ],
  "count": 1
}
```

## n8n Integration

Since you're using n8n for webhooks:

1. **Webhook receives messages** → n8n workflow
2. **Store in database** → Add database node in n8n workflow
3. **Fetch messages** → Use `/api/messages` endpoint (configure database connection)

## Database Setup Examples

### MongoDB Example

```javascript
const { MongoClient } = await import("mongodb");
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();
const messages = await db
  .collection("messages")
  .find({})
  .sort({ timestamp: -1 })
  .limit(100)
  .toArray();
```

### PostgreSQL Example

```javascript
const { Pool } = await import("pg");
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const result = await pool.query(
  "SELECT * FROM messages ORDER BY timestamp DESC LIMIT 100"
);
const messages = result.rows;
```

### Vercel KV Example

```javascript
const { kv } = await import("@vercel/kv");
const messages = await kv.lrange("whatsapp:messages", 0, 99);
```

## Testing

Test locally with:

```bash
vercel dev
```

Then access:

- http://localhost:3000/api/verify-phone
- http://localhost:3000/api/send-message (POST)
- http://localhost:3000/api/messages
