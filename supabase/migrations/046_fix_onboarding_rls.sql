-- Fix: Allow new users to create companies during onboarding
-- Without this, onboarding fails with RLS error 42501
CREATE POLICY "Authenticated users can create companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- New bank fields on companies (keep bank_account for backwards compat)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bankgiro TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iban TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bic TEXT DEFAULT '';

-- Free-text instruments field on company_settings (for AI categorization later)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS instruments_text TEXT DEFAULT '';
