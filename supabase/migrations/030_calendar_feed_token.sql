-- Add calendar_token to company_settings for secure calendar feed access
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS calendar_token text DEFAULT encode(gen_random_bytes(24), 'hex');

-- Generate tokens for existing users
UPDATE company_settings SET calendar_token = encode(gen_random_bytes(24), 'hex') WHERE calendar_token IS NULL;
