-- Platform configuration table for admin-configurable settings
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default free tier limits
INSERT INTO platform_config (key, value) VALUES
  ('free_invoice_limit', '5'),
  ('free_receipt_scan_limit', '3')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read config"
  ON platform_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage config"
  ON platform_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
