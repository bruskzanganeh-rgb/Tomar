-- Add locale column to company_settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'sv';
