-- Lägg till kategori för gig-bilagor
-- gig_info = Gig-information (noter, schema, repertoar)
-- invoice_doc = Fakturaunderlag (kontrakt, PO, avtal)

ALTER TABLE gig_attachments
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'gig_info'
CHECK (category IN ('gig_info', 'invoice_doc'));

-- Lägg till koppling till faktura för bilagor som ska skickas med fakturan
ALTER TABLE gig_attachments
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Index för snabbare sökning på kategori och faktura
CREATE INDEX IF NOT EXISTS idx_gig_attachments_category ON gig_attachments(category);
CREATE INDEX IF NOT EXISTS idx_gig_attachments_invoice ON gig_attachments(invoice_id);
