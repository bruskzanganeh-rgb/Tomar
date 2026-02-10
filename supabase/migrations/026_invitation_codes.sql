-- Invitation codes for restricted registration
CREATE TABLE invitation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitation codes
CREATE POLICY "admin_manage_codes" ON invitation_codes
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Function to use an invitation code (called from service_role)
CREATE OR REPLACE FUNCTION use_invitation_code(code_value TEXT, uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE invitation_codes
  SET use_count = use_count + 1,
      used_by = uid,
      used_at = now()
  WHERE code = code_value
    AND use_count < max_uses
    AND (expires_at IS NULL OR expires_at > now());

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
