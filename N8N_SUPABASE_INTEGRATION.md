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

## Step 2: Update Your Workflow Connections

Your workflow should look like this:

```
WhatsApp Trigger
    ↓
Store Message in Supabase (NEW)
    ↓
Handle Message Types
    ├─→ Supported → AI Sales Agent → Reply To User
    └─→ Not Supported → Reply To User1
```

## Step 3: Field Mapping Reference

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

## Step 4: Also Store Outgoing Messages (Optional)

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

## Step 5: Test Your Integration

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
- [ ] Supabase credentials added to n8n
- [ ] Supabase Insert node added to workflow
- [ ] Field mappings configured correctly
- [ ] Workflow connections updated
- [ ] Workflow activated
- [ ] Test message sent
- [ ] Message appears in Supabase table
- [ ] Message appears in admin panel

## Next Steps

Once messages are storing correctly:
1. Your admin panel will show all conversations
2. You can search through messages
3. You can see conversation history
4. You can send messages from the admin panel

The admin panel will automatically fetch and display messages from Supabase when you click "Refresh Messages"!

