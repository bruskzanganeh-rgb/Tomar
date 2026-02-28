-- Per-user preference to filter all views to only show their own data
-- When TRUE in shared mode, only the user's own gigs/invoices/expenses are shown
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS show_only_my_data BOOLEAN DEFAULT FALSE;
