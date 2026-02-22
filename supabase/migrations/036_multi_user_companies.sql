-- ============================================================
-- Migration 036: Multi-user companies
--
-- Introduces company-level data sharing. Multiple users can
-- belong to one company with shared clients, invoices, etc.
-- Gig visibility is configurable: personal or shared.
-- ============================================================

-- ============================================================
-- 1. COMPANIES TABLE
-- ============================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Company identity
  company_name TEXT NOT NULL DEFAULT '',
  org_number TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  bank_account TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  country_code TEXT DEFAULT 'SE',
  -- Tax / invoicing
  vat_registration_number TEXT,
  late_payment_interest_text TEXT DEFAULT 'Efter förfallodagen debiteras dröjsmålsränta med 10%',
  show_logo_on_invoice BOOLEAN DEFAULT true,
  our_reference TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  payment_terms_default INTEGER DEFAULT 30,
  base_currency TEXT DEFAULT 'SEK',
  -- Email provider (company-level)
  email_provider TEXT DEFAULT 'platform' CHECK (email_provider IN ('platform', 'smtp')),
  email_inbound_address TEXT,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  smtp_from_name TEXT,
  -- Dropbox integration (company-level)
  dropbox_access_token TEXT,
  dropbox_refresh_token TEXT,
  dropbox_token_expires_at TIMESTAMPTZ,
  dropbox_account_id TEXT,
  dropbox_connected_at TIMESTAMPTZ,
  -- Multi-user settings
  gig_visibility TEXT NOT NULL DEFAULT 'personal'
    CHECK (gig_visibility IN ('personal', 'shared')),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. COMPANY MEMBERS
-- ============================================================
CREATE TABLE company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_company_members_company ON company_members(company_id);

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. COMPANY INVITATIONS
-- ============================================================
CREATE TABLE company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_email TEXT,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_company_invitations_token ON company_invitations(token);
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM company_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_company_member(cid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE company_id = cid AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION company_gig_visibility(cid UUID)
RETURNS TEXT AS $$
  SELECT gig_visibility FROM companies WHERE id = cid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Atomic invoice number generation per company
CREATE OR REPLACE FUNCTION get_next_invoice_number(cid UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  UPDATE companies
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = cid
  RETURNING next_invoice_number - 1 INTO next_num;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. ADD company_id TO ALL DATA TABLES
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE gig_dates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE gig_attachments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE invoice_gigs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE gig_types ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE positions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_gigs_company ON gigs(company_id);
CREATE INDEX IF NOT EXISTS idx_gig_dates_company ON gig_dates(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_gig_types_company ON gig_types(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_company ON positions(company_id);

-- Calendar per-user setting for shared mode
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS calendar_show_all_members BOOLEAN DEFAULT true;

-- ============================================================
-- 6. MIGRATE EXISTING DATA
-- ============================================================
DO $$
DECLARE
  cs RECORD;
  new_company_id UUID;
BEGIN
  FOR cs IN
    SELECT * FROM company_settings WHERE user_id IS NOT NULL
  LOOP
    INSERT INTO companies (
      company_name, org_number, address, email, phone, bank_account,
      logo_url, country_code,
      vat_registration_number, late_payment_interest_text,
      show_logo_on_invoice, our_reference,
      invoice_prefix, next_invoice_number, payment_terms_default, base_currency,
      email_provider, email_inbound_address,
      smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name,
      dropbox_access_token, dropbox_refresh_token, dropbox_token_expires_at,
      dropbox_account_id, dropbox_connected_at
    )
    VALUES (
      COALESCE(cs.company_name, ''),
      COALESCE(cs.org_number, ''),
      COALESCE(cs.address, ''),
      COALESCE(cs.email, ''),
      COALESCE(cs.phone, ''),
      COALESCE(cs.bank_account, ''),
      cs.logo_url,
      COALESCE(cs.country_code, 'SE'),
      cs.vat_registration_number,
      cs.late_payment_interest_text,
      COALESCE(cs.show_logo_on_invoice, true),
      cs.our_reference,
      COALESCE(cs.invoice_prefix, 'INV'),
      COALESCE(cs.next_invoice_number, 1),
      COALESCE(cs.payment_terms_default, 30),
      COALESCE(cs.base_currency, 'SEK'),
      cs.email_provider,
      cs.email_inbound_address,
      cs.smtp_host,
      cs.smtp_port,
      cs.smtp_user,
      cs.smtp_password,
      cs.smtp_from_email,
      cs.smtp_from_name,
      cs.dropbox_access_token,
      cs.dropbox_refresh_token,
      cs.dropbox_token_expires_at,
      cs.dropbox_account_id,
      cs.dropbox_connected_at
    )
    RETURNING id INTO new_company_id;

    -- Make user the company owner
    INSERT INTO company_members (company_id, user_id, role)
    VALUES (new_company_id, cs.user_id, 'owner');

    -- Set company_id on all user's data
    UPDATE clients SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE gigs SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE gig_dates SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE gig_attachments SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE invoices SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE invoice_lines SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE invoice_gigs SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE expenses SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE gig_types SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE positions SET company_id = new_company_id WHERE user_id = cs.user_id;
    UPDATE contacts SET company_id = new_company_id WHERE user_id = cs.user_id;
  END LOOP;
END $$;

-- ============================================================
-- 7. SET DEFAULTS FOR NEW INSERTS
-- ============================================================
ALTER TABLE clients ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE gigs ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE gig_dates ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE gig_attachments ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE invoices ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE invoice_lines ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE invoice_gigs ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE expenses ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE gig_types ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE positions ALTER COLUMN company_id SET DEFAULT get_user_company_id();
ALTER TABLE contacts ALTER COLUMN company_id SET DEFAULT get_user_company_id();

-- ============================================================
-- 8. INVOICE NUMBER: per-company unique instead of global
-- ============================================================
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
ALTER TABLE invoices ADD CONSTRAINT invoices_company_invoice_number_unique
  UNIQUE(company_id, invoice_number);

-- ============================================================
-- 9. SUBSCRIPTION: add company_id and team plan
-- ============================================================
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Link existing subscriptions to owner's company
UPDATE subscriptions s
SET company_id = cm.company_id
FROM company_members cm
WHERE cm.user_id = s.user_id AND cm.role = 'owner';

-- Add team plan option
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'team';

-- ============================================================
-- 10. REWRITE RLS POLICIES
-- ============================================================

-- --- COMPANIES ---
CREATE POLICY "Members can read their company" ON companies
  FOR SELECT USING (is_company_member(id));
CREATE POLICY "Owners can update their company" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_id = companies.id AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- --- COMPANY MEMBERS ---
CREATE POLICY "Members can see co-members" ON company_members
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Owners can insert members" ON company_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );
CREATE POLICY "Owners can delete members" ON company_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );

-- --- COMPANY INVITATIONS ---
CREATE POLICY "Company members can read invitations" ON company_invitations
  FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Owners can create invitations" ON company_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_id = company_invitations.company_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );
-- Anyone can read by token (for join flow) via service_role

-- --- CLIENTS (always shared within company) ---
DROP POLICY IF EXISTS "Users own clients" ON clients;
CREATE POLICY "Company members access clients" ON clients
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- GIG TYPES (always shared) ---
DROP POLICY IF EXISTS "Users own gig_types" ON gig_types;
CREATE POLICY "Company members access gig_types" ON gig_types
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- POSITIONS (always shared) ---
DROP POLICY IF EXISTS "Users own positions" ON positions;
CREATE POLICY "Company members access positions" ON positions
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- CONTACTS (always shared) ---
DROP POLICY IF EXISTS "Users own contacts" ON contacts;
CREATE POLICY "Company members access contacts" ON contacts
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- GIGS (visibility-dependent) ---
DROP POLICY IF EXISTS "Users own gigs" ON gigs;
CREATE POLICY "Company gigs select" ON gigs
  FOR SELECT USING (
    company_id = get_user_company_id()
    AND (
      company_gig_visibility(company_id) = 'shared'
      OR user_id = auth.uid()
    )
  );
CREATE POLICY "Company gigs insert" ON gigs
  FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Company gigs update" ON gigs
  FOR UPDATE USING (
    company_id = get_user_company_id()
    AND (
      company_gig_visibility(company_id) = 'shared'
      OR user_id = auth.uid()
    )
  );
CREATE POLICY "Company gigs delete" ON gigs
  FOR DELETE USING (
    company_id = get_user_company_id()
    AND (
      company_gig_visibility(company_id) = 'shared'
      OR user_id = auth.uid()
    )
  );

-- --- GIG DATES (follows gig visibility) ---
DROP POLICY IF EXISTS "Users own gig_dates" ON gig_dates;
CREATE POLICY "Company gig_dates access" ON gig_dates
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- GIG ATTACHMENTS (follows gig visibility) ---
DROP POLICY IF EXISTS "Users own gig_attachments" ON gig_attachments;
CREATE POLICY "Company gig_attachments access" ON gig_attachments
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- INVOICES (always shared within company) ---
DROP POLICY IF EXISTS "Users own invoices" ON invoices;
CREATE POLICY "Company invoices access" ON invoices
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- INVOICE LINES ---
DROP POLICY IF EXISTS "Users own invoice_lines" ON invoice_lines;
CREATE POLICY "Company invoice_lines access" ON invoice_lines
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- INVOICE GIGS ---
DROP POLICY IF EXISTS "Users own invoice_gigs" ON invoice_gigs;
CREATE POLICY "Company invoice_gigs access" ON invoice_gigs
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- EXPENSES (always shared within company) ---
DROP POLICY IF EXISTS "Users own expenses" ON expenses;
CREATE POLICY "Company expenses access" ON expenses
  FOR ALL USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- --- SUBSCRIPTIONS ---
DROP POLICY IF EXISTS "Users own their subscription" ON subscriptions;
CREATE POLICY "Company subscription read" ON subscriptions
  FOR SELECT USING (
    company_id = get_user_company_id()
    OR user_id = auth.uid()
  );
CREATE POLICY "Owner manages subscription" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System creates subscription" ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- company_settings stays user-scoped (personal prefs) — no change needed
