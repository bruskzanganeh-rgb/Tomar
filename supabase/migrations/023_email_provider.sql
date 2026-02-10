-- Add email_provider column to company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS email_provider TEXT DEFAULT 'platform'
  CHECK (email_provider IN ('platform', 'smtp'));

-- Add Resend configuration to platform_config
INSERT INTO platform_config (key, value) VALUES
  ('resend_api_key', ''),
  ('resend_from_email', 'faktura@babalisk.com')
ON CONFLICT (key) DO NOTHING;
