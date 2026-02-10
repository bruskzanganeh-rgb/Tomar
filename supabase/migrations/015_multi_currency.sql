-- Multi-currency support
-- Each account has a base_currency. All amounts are stored in original currency
-- AND converted to base currency for consistent aggregation/statistics.

-- Company settings: base currency per account
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'SEK';

-- Gigs: original currency + converted to base
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SEK';
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS fee_base NUMERIC(10,2);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS travel_expense_base NUMERIC(10,2);
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6);

-- Invoices: original currency + converted to base
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SEK';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_base NUMERIC(10,2);

-- Expenses: rename amount_sek → amount_base (generic name for any base currency)
ALTER TABLE expenses RENAME COLUMN amount_sek TO amount_base;

-- Clients: invoice language (for PDF generation in correct language)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS invoice_language TEXT DEFAULT 'sv';

-- Exchange rates cache table (populated from Frankfurter/ECB API)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC(12,6) NOT NULL,
  date DATE NOT NULL,
  source TEXT DEFAULT 'ecb',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_currency, target_currency, date)
);

-- RLS for exchange_rates
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON exchange_rates FOR ALL USING (true);

-- Backfill existing data: everything is SEK, rate = 1.0
UPDATE gigs SET currency = 'SEK', fee_base = fee, travel_expense_base = travel_expense, exchange_rate = 1.0
WHERE currency IS NULL OR fee_base IS NULL;

UPDATE invoices SET currency = 'SEK', total_base = total, exchange_rate = 1.0
WHERE currency IS NULL OR total_base IS NULL;
