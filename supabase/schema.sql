-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE gig_status AS ENUM ('pending', 'accepted', 'declined', 'completed', 'invoiced', 'paid');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');

-- Clients table (Uppdragsgivare)
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  org_number TEXT,
  client_code TEXT, -- t.ex. "LKH 1121"
  address TEXT,
  payment_terms INTEGER DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table (Kontaktpersoner)
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gig types table (Uppdragstyper)
CREATE TABLE gig_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  vat_rate NUMERIC(5,2) NOT NULL, -- 0, 6, 25
  color TEXT, -- hex color för UI
  default_description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default gig types
INSERT INTO gig_types (name, vat_rate, color, is_default) VALUES
  ('Konsert', 0, '#3b82f6', TRUE),
  ('Inspelning', 6, '#8b5cf6', TRUE),
  ('Undervisning', 25, '#10b981', TRUE);

-- Gigs table (Uppdrag)
CREATE TABLE gigs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gig_type_id UUID NOT NULL REFERENCES gig_types(id),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT,
  fee NUMERIC(10,2) NOT NULL,
  travel_expense NUMERIC(10,2),
  status gig_status DEFAULT 'pending',
  response_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  calendar_event_id TEXT, -- Google Calendar event ID
  email_source TEXT, -- Original email om det kom via mail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table (Fakturor)
CREATE TABLE invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number INTEGER NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  subtotal NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(5,2) NOT NULL,
  vat_amount NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  pdf_url TEXT,
  sent_date TIMESTAMP WITH TIME ZONE,
  status invoice_status DEFAULT 'draft',
  imported_from_pdf BOOLEAN DEFAULT FALSE,
  original_pdf_url TEXT, -- Dropbox URL om importerad
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice lines table (Fakturarader)
CREATE TABLE invoice_lines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  is_vat_exempt BOOLEAN DEFAULT FALSE, -- för reseersättning
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table (Utgifter/Kvitton)
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  supplier TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT,
  gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company settings table (Företagsinställningar)
CREATE TABLE company_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  org_number TEXT NOT NULL,
  address TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  bank_account TEXT NOT NULL,
  logo_url TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  payment_terms_default INTEGER DEFAULT 30,
  email_inbound_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default company settings (Babalisk AB)
INSERT INTO company_settings (
  company_name,
  org_number,
  address,
  email,
  phone,
  bank_account,
  next_invoice_number
) VALUES (
  'Babalisk AB',
  '559087-7451',
  E'Ymsenv\u00e4gen 8\nc/o Brusk Zanganeh\n12038 \u00c5rsta',
  'brusk.zanganeh@gmail.com',
  '+46 (0) 709 655 980',
  '5108-2667',
  46  -- Start från nuvarande fakturanummer
);

-- Create indexes för performance
CREATE INDEX idx_gigs_client_id ON gigs(client_id);
CREATE INDEX idx_gigs_date ON gigs(date);
CREATE INDEX idx_gigs_status ON gigs(status);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_contacts_client_id ON contacts(client_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_gig_id ON expenses(gig_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers för auto-update av updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gigs_updated_at BEFORE UPDATE ON gigs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views för statistik
CREATE VIEW invoice_statistics AS
SELECT
  EXTRACT(YEAR FROM invoice_date) as year,
  EXTRACT(MONTH FROM invoice_date) as month,
  COUNT(*) as invoice_count,
  SUM(total) as total_revenue,
  SUM(vat_amount) as total_vat
FROM invoices
WHERE status != 'draft'
GROUP BY year, month
ORDER BY year DESC, month DESC;

CREATE VIEW client_statistics AS
SELECT
  c.id,
  c.name,
  COUNT(DISTINCT g.id) as total_gigs,
  COUNT(DISTINCT i.id) as total_invoices,
  COALESCE(SUM(i.total), 0) as total_revenue,
  MAX(i.invoice_date) as last_invoice_date
FROM clients c
LEFT JOIN gigs g ON g.client_id = c.id
LEFT JOIN invoices i ON i.client_id = c.id
GROUP BY c.id, c.name;

-- Row Level Security (RLS) - för framtida multi-user support
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- För nu: allow all (eftersom det är single-user)
CREATE POLICY "Allow all for authenticated users" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON gig_types FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON gigs FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON invoice_lines FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON company_settings FOR ALL USING (true);
