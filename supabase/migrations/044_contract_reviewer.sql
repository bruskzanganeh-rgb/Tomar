-- Add reviewer support for two-step contract signing flow
-- Reviewer (Person A) reviews → Signer (Person B) signs

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS reviewer_name TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_email TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_title TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS reviewer_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Extend status enum with review steps
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent_to_reviewer', 'reviewed', 'sent', 'viewed', 'signed', 'expired', 'cancelled'));

-- Extend audit event types
ALTER TABLE contract_audit DROP CONSTRAINT IF EXISTS contract_audit_event_type_check;
ALTER TABLE contract_audit ADD CONSTRAINT contract_audit_event_type_check
  CHECK (event_type IN ('created', 'sent_to_reviewer', 'reviewed', 'approved', 'sent', 'resent', 'viewed', 'signed', 'expired', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_contracts_reviewer_token ON contracts(reviewer_token) WHERE reviewer_token IS NOT NULL;
