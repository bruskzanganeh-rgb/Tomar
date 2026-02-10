-- Add DEFAULT auth.uid() to all user-owned tables
-- This ensures client-side inserts automatically get the correct user_id
-- without needing to explicitly set it in component code

ALTER TABLE clients ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE gigs ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE gig_dates ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE gig_attachments ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE invoices ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE invoice_lines ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE invoice_gigs ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE expenses ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE gig_types ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE positions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE contacts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE company_settings ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE ai_usage_logs ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE exchange_rates ALTER COLUMN user_id SET DEFAULT auth.uid();
