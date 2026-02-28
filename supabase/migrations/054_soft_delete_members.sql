-- Soft-delete for company members: keep identity for data attribution
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- Update get_user_company_id() to exclude removed members
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM company_members
  WHERE user_id = auth.uid() AND removed_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
