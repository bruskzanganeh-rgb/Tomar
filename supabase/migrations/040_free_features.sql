-- Add free tier features to platform_config
INSERT INTO platform_config (key, value) VALUES
  ('free_features', '["unlimitedGigs","basicInvoicing","calendarView"]')
ON CONFLICT (key) DO NOTHING;
