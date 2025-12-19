-- Create conversations table for storing per-contact auto-reply settings
-- SAFE VERSION - Handles existing objects gracefully
-- Run this in your Supabase SQL Editor

-- Create table (will not error if already exists)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT DEFAULT 'Thank you for your message! We''ll get back to you soon.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index (will not error if already exists)
CREATE INDEX IF NOT EXISTS idx_conversations_phone_number ON conversations(phone_number);

-- Create function (will replace if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE
    ON conversations FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists, then create
DROP POLICY IF EXISTS "Service role can manage conversations" ON conversations;
CREATE POLICY "Service role can manage conversations"
  ON conversations
  FOR ALL
  USING (auth.role() = 'service_role');

-- Alternative: If you're using anon key, use this policy instead (less secure)
-- Uncomment the lines below and comment out the service_role policy above
-- DROP POLICY IF EXISTS "Public can manage conversations" ON conversations;
-- CREATE POLICY "Public can manage conversations"
--   ON conversations
--   FOR ALL
--   USING (true);


