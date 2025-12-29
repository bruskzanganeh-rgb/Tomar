-- Migration: Svarsdatum för gig-förfrågningar
-- Hjälper musiker hålla koll på när de måste svara på förfrågningar

-- Lägg till svarsdatum på gigs
ALTER TABLE gigs ADD COLUMN response_deadline DATE;

-- Index för att snabbt hitta gigs som behöver svar
CREATE INDEX idx_gigs_pending_deadline ON gigs(response_deadline)
  WHERE status IN ('pending', 'tentative');

-- Kommentar för dokumentation
COMMENT ON COLUMN gigs.response_deadline IS 'Datum då orkestern behöver svar på förfrågan';
