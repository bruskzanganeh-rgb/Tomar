-- Koppla expenses till gigs
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS gig_id UUID REFERENCES gigs(id);
CREATE INDEX IF NOT EXISTS idx_expenses_gig_id ON expenses(gig_id);

-- Kommentar för tydlighet
COMMENT ON COLUMN expenses.gig_id IS 'Koppling till uppdrag för reseersättning etc';
