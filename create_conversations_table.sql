-- Create conversations table for storing per-contact auto-reply settings
-- Run this in your Supabase SQL Editor

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
-- If you're using service_role key, this policy allows it
CREATE POLICY "Service role can manage conversations"
  ON conversations
  FOR ALL
  USING (auth.role() = 'service_role');

-- Alternative: If you're using anon key, use this policy instead (less secure)
-- Uncomment the lines below and comment out the service_role policy above
-- CREATE POLICY "Public can manage conversations"
--   ON conversations
--   FOR ALL
--   USING (true);

