-- Junction table for many-to-many relationship between invoices and gigs
-- Enables samlingsfaktura (collective invoices for multiple gigs)
CREATE TABLE IF NOT EXISTS invoice_gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(invoice_id, gig_id)
);

-- Migrate existing invoice-gig relationships from the gig_id column
INSERT INTO invoice_gigs (invoice_id, gig_id)
SELECT id, gig_id FROM invoices WHERE gig_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE invoice_gigs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON invoice_gigs FOR ALL USING (true);
