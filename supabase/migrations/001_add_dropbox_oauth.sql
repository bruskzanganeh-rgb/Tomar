-- Add Dropbox OAuth fields to company_settings table
ALTER TABLE company_settings
ADD COLUMN dropbox_access_token TEXT,
ADD COLUMN dropbox_refresh_token TEXT,
ADD COLUMN dropbox_token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN dropbox_account_id TEXT,
ADD COLUMN dropbox_connected_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN company_settings.dropbox_access_token IS 'Encrypted Dropbox access token for API access';
COMMENT ON COLUMN company_settings.dropbox_refresh_token IS 'Encrypted Dropbox refresh token (expires after 4 hours)';
COMMENT ON COLUMN company_settings.dropbox_token_expires_at IS 'Timestamp when the access token expires';
COMMENT ON COLUMN company_settings.dropbox_account_id IS 'Dropbox account ID for reference';
COMMENT ON COLUMN company_settings.dropbox_connected_at IS 'When the Dropbox integration was first connected';
