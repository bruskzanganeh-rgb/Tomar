-- Add indexes on frequently filtered/sorted columns
CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
CREATE INDEX IF NOT EXISTS idx_gigs_date ON gigs(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Remove dangerous anon policies on gig-attachments storage bucket
-- (authenticated policies added in migration 029 are sufficient)
DROP POLICY IF EXISTS "gig_attachments_delete" ON storage.objects;
DROP POLICY IF EXISTS "gig_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "gig_attachments_select" ON storage.objects;
