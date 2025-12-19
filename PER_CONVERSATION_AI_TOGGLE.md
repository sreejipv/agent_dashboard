# Per-Conversation AI Auto-Reply Toggle Setup

This guide explains how to set up per-conversation AI auto-reply toggle for your WhatsApp dashboard.

## Overview

Each conversation (contact) has its own AI auto-reply toggle. When enabled for a specific contact, the AI bot will automatically reply to messages from that contact via the n8n workflow.

- **Toggle ON (Green)**: AI bot responds automatically to messages from this contact
- **Toggle OFF (Gray)**: No AI replies - you reply manually from dashboard

## Database Setup

### Step 1: Create Conversations Table

Run this SQL in your Supabase SQL Editor (see `create_conversations_table.sql`):

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT DEFAULT 'Thank you for your message! We''ll get back to you soon.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_phone_number ON conversations(phone_number);

-- Enable RLS and create policy
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage conversations"
  ON conversations FOR ALL
  USING (auth.role() = 'service_role');
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
- **URL**: `https://your-vercel-app.vercel.app/api/conversations/settings?contact={{ $('WhatsApp Trigger').item.json.messages[0].from }}`
- **Authentication**: None

**Important**: The `contact` parameter should be the phone number from the incoming message: `{{ $('WhatsApp Trigger').item.json.messages[0].from }}`

**Response Format**:
```json
{
  "success": true,
  "settings": {
    "phone_number": "919496326525",
    "auto_reply_enabled": true,
    "auto_reply_message": "Thank you for your message! We'll get back to you soon."
  }
}
```

### Step 4: Configure IF Node

**Node Name**: "Is Auto-Reply Enabled?"

**Option 1 - Expression**:
- **Condition Type**: Expression
- **Expression**: `{{ $json.settings.auto_reply_enabled === true }}`

**Option 2 - Boolean Check**:
- **Field**: `{{ $json.settings.auto_reply_enabled }}`
- **Operation**: Boolean → is true

## API Endpoints

### GET `/api/conversations/settings?contact=PHONE_NUMBER`
Get auto-reply settings for a specific contact.

**Response**:
```json
{
  "success": true,
  "settings": {
    "phone_number": "919496326525",
    "auto_reply_enabled": true,
    "auto_reply_message": "Thank you for your message! We'll get back to you soon."
  }
}
```

If no settings exist, returns default (enabled: false).

### POST `/api/conversations/settings`
Create or update settings for a contact.

**Request Body**:
```json
{
  "phone_number": "919496326525",
  "auto_reply_enabled": true,
  "auto_reply_message": "Thank you for your message! We'll get back to you soon."
}
```

**Response**:
```json
{
  "success": true,
  "settings": {
    "phone_number": "919496326525",
    "auto_reply_enabled": true,
    "auto_reply_message": "Thank you for your message! We'll get back to you soon."
  }
}
```

## Admin Panel

### Toggle Location

The AI toggle is in the **chat header** (right side, when a conversation is selected):
- Green = AI ON for this contact
- Gray = AI OFF for this contact

### How It Works

1. **Select a conversation** from the left sidebar
2. **Toggle appears in the chat header** (next to refresh button)
3. **Toggle ON**: AI will reply to messages from this contact
4. **Toggle OFF**: No AI replies - you reply manually

## Testing

### Test 1: Enable AI for Contact A
1. Select conversation with Contact A
2. Toggle AI ON (green) in chat header
3. Send message from Contact A's phone
4. AI should reply automatically
5. Dashboard shows conversation

### Test 2: Disable AI for Contact A
1. Select conversation with Contact A
2. Toggle AI OFF (gray) in chat header
3. Send message from Contact A's phone
4. No AI reply should come
5. Dashboard shows message
6. You type and send reply manually

### Test 3: Different Settings for Different Contacts
1. Enable AI for Contact A
2. Disable AI for Contact B
3. Contact A messages → AI replies
4. Contact B messages → No AI reply, you reply manually

## Troubleshooting

### Toggle not working
- Check if `conversations` table exists in Supabase
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are set in Vercel
- Check browser console for errors
- Verify the contact phone number format matches

### AI not replying when toggle is ON
- Check n8n workflow is active
- Verify HTTP Request node URL is correct
- Check IF node condition: `{{ $json.settings.auto_reply_enabled === true }}`
- Verify phone number format matches (with/without country code)
- Check n8n execution logs

### Database errors
- Ensure `conversations` table is created
- Check RLS policies allow your API key to read/write
- Verify table has correct columns: `phone_number`, `auto_reply_enabled`, `auto_reply_message`

## Key Points

✅ **Per-Conversation**: Each contact has independent AI toggle
✅ **n8n Controlled**: AI replies handled by n8n workflow checking per-contact settings
✅ **Manual Override**: When OFF, you reply manually from dashboard
✅ **Database Stored**: Settings persist in Supabase `conversations` table


