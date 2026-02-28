-- ============================================================================
-- Migration 051: Create dedicated E2E test company with RLS isolation
--
-- Creates "E2E Test AB" with a dedicated owner + member account.
-- RLS via get_user_company_id() ensures complete isolation from real data.
-- ============================================================================

BEGIN;

-- Fixed UUIDs for easy reference
-- Test company:  11111111-1111-1111-1111-111111111111
-- Owner user:    be0fbfb1-dc14-4512-9d46-90ac0ed69ea2 (e2e-owner@amida-test.com)
-- Member user:   051749a5-4a0c-410d-8c55-70980098af20 (e2e-member@amida-test.com)

-- ============================================================================
-- 1. Create test company
-- ============================================================================
INSERT INTO companies (id, company_name, org_number, address, email, phone, bank_account, country_code, base_currency, gig_visibility)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'E2E Test AB',
  '999999-9999',
  'Testgatan 1, 111 11 Teststaden',
  'dlshdzangana@gmail.com',
  '070-1234567',
  '1234-5678901234',
  'SE',
  'SEK',
  'shared'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Add owner to test company
-- ============================================================================
INSERT INTO company_members (company_id, user_id, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'be0fbfb1-dc14-4512-9d46-90ac0ed69ea2', 'owner')
ON CONFLICT (company_id, user_id) DO NOTHING;

-- ============================================================================
-- 3. Create company_settings for owner
-- ============================================================================
INSERT INTO company_settings (company_name, org_number, address, email, phone, bank_account, user_id, onboarding_completed, locale, country_code, base_currency)
VALUES (
  'E2E Test AB',
  '999999-9999',
  'Testgatan 1, 111 11 Teststaden',
  'dlshdzangana@gmail.com',
  '070-1234567',
  '1234-5678901234',
  'be0fbfb1-dc14-4512-9d46-90ac0ed69ea2',
  true,
  'sv',
  'SE',
  'SEK'
) ON CONFLICT (user_id) DO UPDATE SET
  onboarding_completed = true,
  company_name = 'E2E Test AB';

-- ============================================================================
-- 4. Move member from StageSub AB to test company
-- ============================================================================
-- Remove from old company
DELETE FROM company_members
WHERE user_id = '051749a5-4a0c-410d-8c55-70980098af20'
AND company_id != '11111111-1111-1111-1111-111111111111';

-- Add to test company
INSERT INTO company_members (company_id, user_id, role)
VALUES ('11111111-1111-1111-1111-111111111111', '051749a5-4a0c-410d-8c55-70980098af20', 'member')
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Update member's company_settings
UPDATE company_settings SET
  company_name = 'E2E Test AB',
  onboarding_completed = true
WHERE user_id = '051749a5-4a0c-410d-8c55-70980098af20';

-- ============================================================================
-- 5. Create subscription (pro plan for full feature testing)
-- ============================================================================
INSERT INTO subscriptions (user_id, company_id, plan, status)
VALUES ('be0fbfb1-dc14-4512-9d46-90ac0ed69ea2', '11111111-1111-1111-1111-111111111111', 'pro', 'active')
ON CONFLICT (user_id) DO UPDATE SET plan = 'pro', status = 'active', company_id = '11111111-1111-1111-1111-111111111111';

-- ============================================================================
-- 6. Seed test data (gig types, positions, client)
-- ============================================================================
INSERT INTO gig_types (name, vat_rate, company_id) VALUES
  ('Konsert', 6.00, '11111111-1111-1111-1111-111111111111'),
  ('Rep', 6.00, '11111111-1111-1111-1111-111111111111'),
  ('Inspelning', 25.00, '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO positions (name, company_id) VALUES
  ('E2E 1:a violin', '11111111-1111-1111-1111-111111111111'),
  ('E2E Tutti', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO clients (name, email, company_id) VALUES
  ('Test Client AB', 'client@test.com', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

COMMIT;
