-- Internationalization: country support, VAT numbers, reverse charge
-- ================================================================

-- company_settings: add country
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'SE';

-- clients: add country and VAT number
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- invoices: reverse charge support
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_vat_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reverse_charge BOOLEAN DEFAULT false;
