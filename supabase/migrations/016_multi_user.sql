-- Multi-user support: user_id on all tables + RLS policies
-- Each user sees only their own data.

-- Add user_id to all main tables
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE gig_dates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE gig_attachments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE invoice_gigs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE gig_types ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add UNIQUE constraint: one company_settings row per user
-- (can't use ADD CONSTRAINT IF NOT EXISTS, so use DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_settings_user_id_unique'
  ) THEN
    ALTER TABLE company_settings ADD CONSTRAINT company_settings_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_gigs_user_id ON gigs(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_gig_types_user_id ON gig_types(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_gig_dates_user_id ON gig_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_gig_attachments_user_id ON gig_attachments(user_id);

-- Replace RLS policies with user-scoped ones
-- Pattern: auth.uid() = user_id for all operations

-- clients
DROP POLICY IF EXISTS "Allow all for authenticated users" ON clients;
CREATE POLICY "Users own clients" ON clients
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- gigs
DROP POLICY IF EXISTS "Allow all" ON gigs;
CREATE POLICY "Users own gigs" ON gigs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- gig_dates
DROP POLICY IF EXISTS "Allow all" ON gig_dates;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON gig_dates;
CREATE POLICY "Users own gig_dates" ON gig_dates
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- gig_attachments
DROP POLICY IF EXISTS "Allow all" ON gig_attachments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON gig_attachments;
CREATE POLICY "Users own gig_attachments" ON gig_attachments
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- invoices
DROP POLICY IF EXISTS "Allow all for authenticated users" ON invoices;
CREATE POLICY "Users own invoices" ON invoices
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- invoice_lines
DROP POLICY IF EXISTS "Allow all for authenticated users" ON invoice_lines;
DROP POLICY IF EXISTS "Allow all" ON invoice_lines;
CREATE POLICY "Users own invoice_lines" ON invoice_lines
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- invoice_gigs
DROP POLICY IF EXISTS "Allow all for now" ON invoice_gigs;
CREATE POLICY "Users own invoice_gigs" ON invoice_gigs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- expenses
DROP POLICY IF EXISTS "Allow all for authenticated users" ON expenses;
CREATE POLICY "Users own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- gig_types
DROP POLICY IF EXISTS "Allow all for authenticated users" ON gig_types;
DROP POLICY IF EXISTS "Allow all" ON gig_types;
CREATE POLICY "Users own gig_types" ON gig_types
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- positions
DROP POLICY IF EXISTS "Allow all for authenticated users" ON positions;
DROP POLICY IF EXISTS "Allow all" ON positions;
CREATE POLICY "Users own positions" ON positions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- contacts
DROP POLICY IF EXISTS "Allow all for authenticated users" ON contacts;
DROP POLICY IF EXISTS "Allow all" ON contacts;
CREATE POLICY "Users own contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- company_settings
DROP POLICY IF EXISTS "Allow all for authenticated users" ON company_settings;
DROP POLICY IF EXISTS "Allow all" ON company_settings;
CREATE POLICY "Users own company_settings" ON company_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ai_usage_logs
DROP POLICY IF EXISTS "Allow all for authenticated users" ON ai_usage_logs;
DROP POLICY IF EXISTS "Allow all" ON ai_usage_logs;
CREATE POLICY "Users own ai_usage_logs" ON ai_usage_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- exchange_rates: shared read, user-scoped write
DROP POLICY IF EXISTS "Allow all for now" ON exchange_rates;
CREATE POLICY "Anyone can read exchange_rates" ON exchange_rates
  FOR SELECT USING (true);
CREATE POLICY "Users own exchange_rates" ON exchange_rates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
