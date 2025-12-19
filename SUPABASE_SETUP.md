# Supabase Database Setup

This guide explains how to set up your Supabase database for storing WhatsApp messages.

## Prerequisites

1. A Supabase account and project
2. Your Supabase project URL and service role key

## Database Table Setup

Create a `messages` table in your Supabase database with the following structure:

### SQL to Create Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT UNIQUE,
  from_number TEXT,
  to_number TEXT,
  phone_number TEXT,
  recipient TEXT,
  text TEXT,
  body TEXT,
  message TEXT,
  content TEXT,
  timestamp BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'received',
  message_status TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from_number ON messages(from_number);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to read/write (for API)
CREATE POLICY "Service role can manage messages"
  ON messages
  FOR ALL
  USING (auth.role() = 'service_role');
```

### Alternative: Flexible Schema

If your n8n workflow stores messages with different field names, the API will try to map common variations:

- `id` or `message_id` → message ID
- `from` or `from_number` or `phone_number` → sender number
- `to` or `to_number` or `recipient` → recipient number
- `text` or `body` or `message` or `content` → message content
- `timestamp` or `created_at` → message timestamp
- `type` → message type (defaults to 'text')
- `status` or `message_status` → message status (defaults to 'received')

## Environment Variables

Set these in your `.env.local` (for local development) or Vercel environment variables:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_service_role_key_here
```

## Getting Your Supabase Credentials

1. **SUPABASE_URL**:
   - Go to your Supabase project dashboard
   - Navigate to **Settings** → **API**
   - Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)

2. **SUPABASE_KEY**:
   - In the same **Settings** → **API** page
   - Copy the **service_role** key (for server-side API access)
   - ⚠️ **Important**: Use the service role key, not the anon key, for server-side operations
   - The service role key bypasses Row Level Security (RLS)

## Testing the Connection

After setting up your table and environment variables:

1. Deploy your application
2. The `/api/messages` endpoint will automatically connect to Supabase
3. If Supabase is not configured, it will return an empty array (no error)
4. Check your Supabase dashboard → Table Editor → `messages` to see stored messages

## n8n Integration

If you're using n8n to receive webhooks and store messages:

1. In your n8n workflow, add a Supabase node after the webhook
2. Configure it to insert into the `messages` table
3. Map the incoming webhook data to your table columns
4. The admin panel will automatically fetch and display these messages

## Troubleshooting

### Messages not showing up
- Verify your Supabase credentials are correct
- Check that messages are being inserted into the `messages` table
- Verify the table name is exactly `messages` (case-sensitive)
- Check Supabase logs for any errors

### Permission errors
- Make sure you're using the **service_role** key, not the anon key
- If using RLS, ensure the service role policy is set correctly
- For development, you can temporarily disable RLS: `ALTER TABLE messages DISABLE ROW LEVEL SECURITY;`

### Field mapping issues
- The API tries to map common field name variations
- If your fields have different names, you may need to update `api/messages.js` to match your schema
- Or create a view in Supabase that maps your fields to the expected names


