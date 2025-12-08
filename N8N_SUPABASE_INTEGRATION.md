# n8n Workflow - Supabase Integration Guide

This guide shows you how to add Supabase storage to your n8n WhatsApp workflow so messages appear in your admin panel.

## Overview

Your current workflow:
1. WhatsApp Trigger → Receives messages
2. Handle Message Types → Filters text/non-text
3. AI Sales Agent → Processes and responds
4. Reply To User → Sends response

**What we'll add:**
- A Supabase node to store incoming messages in the database
- This allows messages to appear in your admin panel

## Step 1: Add Supabase Node to Your Workflow

### Option A: Store All Messages (Recommended)

Add a Supabase node **after** the WhatsApp Trigger to store all incoming messages:

1. **Add Supabase Node**
   - Click the "+" button after "WhatsApp Trigger"
   - Search for "Supabase" and add it
   - Name it: "Store Message in Supabase"

2. **Configure Supabase Connection**
   - Click "Create New Credential"
   - **Host**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Secret**: Your `SUPABASE_KEY` (service role key)
   - Click "Save"

3. **Configure the Node**
   - **Operation**: Insert
   - **Table**: `messages`
   - **Columns**: Map the following fields:

```json
{
  "message_id": "={{ $json.messages[0].id }}",
  "from_number": "={{ $json.messages[0].from }}",
  "to_number": "={{ $json.messages[0].to }}",
  "text": "={{ $json.messages[0].text?.body || $json.messages[0].text || '' }}",
  "timestamp": "={{ $json.messages[0].timestamp || Math.floor(Date.now() / 1000) }}",
  "type": "={{ $json.messages[0].type || 'text' }}",
  "status": "received"
}
```

### Option B: Store Only Text Messages

If you only want to store text messages (after the "Handle Message Types" switch):

1. Add Supabase node after the "Supported" output of "Handle Message Types"
2. Use the same configuration as above

## Step 2: Check Auto-Reply Settings (Optional but Recommended)

Before sending automated replies, check if auto-reply is enabled for the contact:

1. **Add HTTP Request Node** (after "Handle Message Types" or before "AI Sales Agent")
   - Name it: "Check Auto-Reply Settings"
   - **Method**: GET
   - **URL**: `https://your-vercel-app.vercel.app/api/conversations/settings?contact={{ $json.messages[0].from }}`
   - **Authentication**: None (or add headers if needed)

2. **Add IF Node** (after "Check Auto-Reply Settings")
   - Name it: "Is Auto-Reply Enabled?"
   - **Condition**: `{{ $json.settings.auto_reply_enabled }}` equals `true`
   - This will route to two paths:
     - **True**: Continue to AI Sales Agent (auto-reply is enabled)
     - **False**: Skip AI Sales Agent (auto-reply is disabled)

3. **Alternative: Use Code Node** (if you prefer)
   ```javascript
   // Check if auto-reply is enabled
   const contact = $input.item.json.messages[0].from;
   const settingsUrl = `https://your-vercel-app.vercel.app/api/conversations/settings?contact=${contact}`;
   
   // Make HTTP request (you can use HTTP Request node instead)
   const response = await fetch(settingsUrl);
   const data = await response.json();
   
   return {
     auto_reply_enabled: data.settings?.auto_reply_enabled || false,
     auto_reply_message: data.settings?.auto_reply_message || '',
     ...$input.item.json
   };
   ```

## Step 3: Update Your Workflow Connections

Your workflow should look like this:

```
WhatsApp Trigger
    ↓
Store Message in Supabase
    ↓
Handle Message Types
    ↓
Check Auto-Reply Settings (NEW)
    ↓
Is Auto-Reply Enabled? (NEW)
    ├─ Yes → AI Sales Agent → Reply To User
    └─ No → End (skip auto-reply)
```

## Step 4: Field Mapping Reference

Here's the exact field mapping for the Supabase Insert node:

| Supabase Column | n8n Expression | Description |
|----------------|-----------------|-------------|
| `message_id` | `={{ $json.messages[0].id }}` | WhatsApp message ID |
| `from_number` | `={{ $json.messages[0].from }}` | Sender phone number |
| `to_number` | `={{ $json.messages[0].to }}` | Recipient (your number) |
| `text` | `={{ $json.messages[0].text?.body || $json.messages[0].text || '' }}` | Message content |
| `timestamp` | `={{ $json.messages[0].timestamp || Math.floor(Date.now() / 1000) }}` | Unix timestamp |
| `type` | `={{ $json.messages[0].type || 'text' }}` | Message type |
| `status` | `received` | Message status |

## Step 5: Use Auto-Reply Message (Optional)

If you want to use the configured auto-reply message instead of AI-generated responses:

1. In your "AI Sales Agent" node or "Reply To User" node, you can access:
   - `{{ $json.settings.auto_reply_message }}` - The configured auto-reply message
   - Or use it as a fallback if AI doesn't generate a response

2. Example in Code Node:
   ```javascript
   const aiResponse = $input.item.json.aiResponse; // Your AI response
   const autoReplyMessage = $input.item.json.settings?.auto_reply_message;
   
   return {
     message: aiResponse || autoReplyMessage || 'Thank you for your message!',
     ...$input.item.json
   };
   ```

## Step 6: Also Store Outgoing Messages (Optional)

To also store messages you send (from "Reply To User" node):

1. Add another Supabase node after "Reply To User"
2. Configure it to insert with:

```json
{
  "message_id": "={{ $json.messages?.[0]?.id || 'sent_' + Date.now() }}",
  "from_number": "={{ $('Reply To User').item.json.recipientPhoneNumber }}",
  "to_number": "={{ $('WhatsApp Trigger').item.json.messages[0].from }}",
  "text": "={{ $('Reply To User').item.json.textBody }}",
  "timestamp": "={{ Math.floor(Date.now() / 1000) }}",
  "type": "text",
  "status": "sent"
}
```

## Step 7: Test Your Integration

1. **Activate your workflow** in n8n
2. **Send a test message** to your WhatsApp number
3. **Check Supabase**:
   - Go to your Supabase dashboard
   - Navigate to Table Editor → `messages`
   - You should see the new message
4. **Check Admin Panel**:
   - Open your admin panel
   - Click "Refresh Messages"
   - Your message should appear!

## Troubleshooting

### Messages not appearing in Supabase

1. **Check Supabase credentials**:
   - Verify your Supabase URL is correct
   - Make sure you're using the **service_role** key (not anon key)

2. **Check field mapping**:
   - Ensure column names match your Supabase table
   - Verify the expressions are correct

3. **Check n8n execution**:
   - Look at the workflow execution logs
   - Check if the Supabase node shows any errors

### Messages not appearing in Admin Panel

1. **Verify Supabase environment variables**:
   - Check Vercel has `SUPABASE_URL` and `SUPABASE_KEY` set
   - Redeploy if you just added them

2. **Check message format**:
   - Messages should have `from_number`, `text`, and `timestamp` fields
   - The admin panel will try to map various field name variations

3. **Test the API directly**:
   - Visit `https://your-app.vercel.app/api/messages`
   - Should return JSON with your messages

## Example: Complete n8n Node Configuration

Here's a JSON snippet you can use for the Supabase Insert node:

```json
{
  "operation": "insert",
  "table": "messages",
  "columns": {
    "message_id": "={{ $json.messages[0].id }}",
    "from_number": "={{ $json.messages[0].from }}",
    "to_number": "={{ $json.messages[0].to }}",
    "text": "={{ $json.messages[0].text?.body || $json.messages[0].text || '' }}",
    "timestamp": "={{ $json.messages[0].timestamp || Math.floor(Date.now() / 1000) }}",
    "type": "={{ $json.messages[0].type || 'text' }}",
    "status": "received"
  }
}
```

## Quick Setup Checklist

- [ ] Supabase table `messages` created (see `SUPABASE_SETUP.md`)
- [ ] Supabase table `conversations` created (see `CONVERSATIONS_TABLE_SETUP.md`)
- [ ] Supabase credentials added to n8n
- [ ] Supabase Insert node added to workflow
- [ ] HTTP Request node added to check auto-reply settings (optional)
- [ ] IF node added to route based on auto-reply status (optional)
- [ ] Field mappings configured correctly
- [ ] Workflow connections updated
- [ ] Workflow activated
- [ ] Test message sent
- [ ] Message appears in Supabase table
- [ ] Message appears in admin panel
- [ ] Auto-reply settings work per conversation

## Next Steps

Once messages are storing correctly:
1. Your admin panel will show all conversations
2. You can search through messages
3. You can see conversation history
4. You can send messages from the admin panel

The admin panel will automatically fetch and display messages from Supabase when you click "Refresh Messages"!

