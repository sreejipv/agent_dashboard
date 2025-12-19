-- Create simple settings table for global auto-reply toggle
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE
    ON settings FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to read/write (for API)
-- If you're using service_role key, this policy allows it
CREATE POLICY "Service role can manage settings"
  ON settings
  FOR ALL
  USING (auth.role() = 'service_role');

-- Alternative: If you're using anon key, use this policy instead (less secure)
-- Uncomment the lines below and comment out the service_role policy above
-- CREATE POLICY "Public can manage settings"
--   ON settings
--   FOR ALL
--   USING (true);

-- Insert default value (auto-reply disabled by default)
INSERT INTO settings (key, value)
VALUES ('auto_reply_enabled', 'false')
ON CONFLICT (key) DO NOTHING;


