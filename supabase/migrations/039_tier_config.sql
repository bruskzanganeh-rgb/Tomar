-- Tier-configurable settings for all plans (free/pro/team)
-- 0 = unlimited for invoice/scan limits

INSERT INTO platform_config (key, value) VALUES
  ('free_storage_mb', '10'),
  ('pro_invoice_limit', '0'),
  ('pro_receipt_scan_limit', '0'),
  ('pro_storage_mb', '1024'),
  ('pro_price_monthly', '49'),
  ('pro_price_yearly', '499'),
  ('pro_features', '["unlimitedInvoices","unlimitedScans","noBranding"]'),
  ('team_invoice_limit', '0'),
  ('team_receipt_scan_limit', '0'),
  ('team_storage_mb', '5120'),
  ('team_price_monthly', '99'),
  ('team_price_yearly', '999'),
  ('team_features', '["everythingInPro","inviteMembers","sharedCalendar"]')
ON CONFLICT (key) DO NOTHING;
