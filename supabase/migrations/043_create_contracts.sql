-- Digital contract signing (SES) for subscription agreements
-- Contracts table + immutable audit trail

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL UNIQUE,

  -- Terms
  tier TEXT NOT NULL,
  annual_price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  billing_interval TEXT NOT NULL DEFAULT 'annual',
  vat_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 25.00,
  contract_start_date DATE NOT NULL,
  contract_duration_months INT NOT NULL DEFAULT 12,
  custom_terms JSONB DEFAULT '{}',

  -- Signer
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_title TEXT,

  -- Signing token (64 hex chars from gen_random_bytes(32))
  signing_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,

  -- Status: draft → sent → viewed → signed | expired | cancelled
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'expired', 'cancelled')),

  -- Document integrity
  document_hash_sha256 TEXT,
  signed_document_hash_sha256 TEXT,

  -- Storage paths (Supabase Storage)
  unsigned_pdf_path TEXT,
  signed_pdf_path TEXT,
  signature_image_path TEXT,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contracts_company_id ON contracts(company_id);
CREATE INDEX idx_contracts_signing_token ON contracts(signing_token) WHERE signing_token IS NOT NULL;
CREATE INDEX idx_contracts_status ON contracts(status);

-- Immutable audit trail
CREATE TABLE IF NOT EXISTS contract_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'sent', 'viewed', 'signed', 'expired', 'cancelled', 'resent')),
  actor_email TEXT,
  ip_address INET,
  user_agent TEXT,
  document_hash_sha256 TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_audit_contract_id ON contract_audit(contract_id);

-- Prevent UPDATE/DELETE on audit trail
REVOKE UPDATE, DELETE ON contract_audit FROM authenticated, anon;

-- RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_audit ENABLE ROW LEVEL SECURITY;

-- Admin full access to contracts
CREATE POLICY "admin_contracts_all" ON contracts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admin full access to audit (read + insert)
CREATE POLICY "admin_audit_select" ON contract_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_audit_insert" ON contract_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Service role bypasses RLS automatically (used for public token-based access)

-- Storage bucket (run manually in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false);
