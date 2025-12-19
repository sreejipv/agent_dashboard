# Simplified AI Auto-Reply Toggle Setup

This guide explains the simplified AI on/off toggle system.

## Overview

The system now uses a **simple global toggle** that controls whether the AI bot automatically replies to incoming messages via the n8n workflow.

- **Toggle ON (Green)**: AI bot responds automatically to all incoming messages
- **Toggle OFF (Gray)**: No AI replies sent - you reply manually from the dashboard

## Database Setup

### Step 1: Create Settings Table

Run this SQL in your Supabase SQL Editor (see `create_settings_table.sql`):

```sql
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Enable RLS and create policy (use service_role or anon key policy)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage settings"
  ON settings FOR ALL
  USING (auth.role() = 'service_role');

-- Insert default (disabled)
INSERT INTO settings (key, value)
VALUES ('auto_reply_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
```

## n8n Workflow Setup

### Step 2: Update Your n8n Workflow

Your workflow should look like this:

```
WhatsApp Trigger
    ↓
Store Incoming Message (Supabase)
    ↓
Check Auto-Reply Status (HTTP Request)
    ↓
Is Auto-Reply Enabled? (IF Node)
    ├─ TRUE → Handle Message Types → AI Sales Agent → Reply To User
    └─ FALSE → STOP (No reply sent)
```

### Step 3: Configure HTTP Request Node

**Node Name**: "Check Auto-Reply Status"

- **Method**: GET
- **URL**: `https://your-vercel-app.vercel.app/api/auto-reply-status`
- **Authentication**: None

**Response Format**:
```json
{
  "enabled": true  // or false
}
```

### Step 4: Configure IF Node

**Node Name**: "Is Auto-Reply Enabled?"

- **Condition Type**: Expression
- **Expression**: `{{ $json.enabled === true }}`

Or use:
- **Field**: `{{ $json.enabled }}`
- **Operation**: Boolean → is true

## API Endpoints

### GET `/api/auto-reply-status`
Returns the current auto-reply status.

**Response**:
```json
{
  "enabled": true
}
```

### POST `/api/auto-reply-status`
Updates the auto-reply status.

**Request Body**:
```json
{
  "enabled": true
}
```

**Response**:
```json
{
  "success": true,
  "enabled": true
}
```

## Admin Panel

### Toggle Location

The AI toggle is now in the **top header** of the admin panel:
- Green/White = AI ON (auto-replies enabled)
- Gray = AI OFF (manual replies only)

### How It Works

1. **Toggle ON**:
   - Customer sends: "Hello"
   - n8n workflow checks status → `enabled: true`
   - AI Agent processes and replies automatically
   - Reply stored in database
   - You see the conversation in dashboard

2. **Toggle OFF**:
   - Customer sends: "Hello"
   - n8n workflow checks status → `enabled: false`
   - Workflow STOPS - No AI reply sent
   - Message stored in database
   - You see it in dashboard
   - You manually type and send reply from dashboard

## Testing

### Test 1: AI ON
1. Toggle should be ON (green/white)
2. Send message from your phone: "test"
3. AI should reply automatically
4. Dashboard shows conversation

### Test 2: AI OFF
1. Click toggle to turn OFF (gray)
2. Send message from your phone: "hello"
3. No AI reply should come
4. Dashboard shows message
5. You type "Hi! How can I help?" manually
6. Click Send
7. Your manual reply goes out

## Key Differences from Previous Version

✅ **Simplified**: No per-conversation settings
✅ **Global Toggle**: One toggle controls all conversations
✅ **n8n Controlled**: AI replies handled entirely by n8n workflow
✅ **Manual Override**: When OFF, you reply manually from dashboard
✅ **No Custom Messages**: AI uses your configured AI agent, no custom auto-reply messages

## Troubleshooting

### Toggle not working
- Check if `settings` table exists in Supabase
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are set in Vercel
- Check browser console for errors

### AI not replying when toggle is ON
- Check n8n workflow is active
- Verify HTTP Request node is calling correct URL
- Check IF node condition is correct: `{{ $json.enabled === true }}`
- Check n8n execution logs

### Database errors
- Ensure `settings` table is created
- Check RLS policies allow your API key to read/write
- Verify table has default value: `auto_reply_enabled = 'false'`


