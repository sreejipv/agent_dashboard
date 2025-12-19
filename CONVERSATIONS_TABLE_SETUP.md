# Conversations Table Setup for Auto-Reply

This guide explains how to set up the `conversations` table in Supabase to store per-conversation auto-reply settings.

## Database Table Setup

Create a `conversations` table in your Supabase database with the following structure:

### SQL to Create Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create conversations table for storing per-contact auto-reply settings
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT DEFAULT 'Thank you for your message! We''ll get back to you soon.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_phone_number ON conversations(phone_number);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE
    ON conversations FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to read/write (for API)
CREATE POLICY "Service role can manage conversations"
  ON conversations
  FOR ALL
  USING (auth.role() = 'service_role');

-- Alternative: Allow public read/write if using anon key (less secure)
-- CREATE POLICY "Public can manage conversations"
--   ON conversations
--   FOR ALL
--   USING (true);
```

## Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `phone_number` | TEXT | Unique phone number of the contact |
| `auto_reply_enabled` | BOOLEAN | Whether auto-reply is enabled for this contact |
| `auto_reply_message` | TEXT | The message to send as auto-reply |
| `created_at` | TIMESTAMP | When the record was created |
| `updated_at` | TIMESTAMP | When the record was last updated |

## Usage

The admin panel will automatically:
1. Create a new record when you enable auto-reply for a contact
2. Update the record when you toggle auto-reply or change the message
3. Load settings when you select a conversation

## API Endpoints

- **GET** `/api/conversations/settings?contact=PHONE_NUMBER` - Get settings for a contact
- **POST** `/api/conversations/settings` - Create or update settings for a contact


