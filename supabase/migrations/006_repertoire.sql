-- Migration: Repertoar-system för att spåra verk och dirigenter
-- Skapar tabeller för verk och koppling till gigs

-- Verk/stycken (musikstycken)
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,           -- "Symfoni nr 5"
  composer TEXT NOT NULL,        -- "Beethoven"
  catalog_number TEXT,           -- "Op. 67" eller "BWV 1001"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unik kombination av titel och kompositör
CREATE UNIQUE INDEX idx_works_title_composer ON works(LOWER(title), LOWER(composer));

-- Koppling gig <-> verk (many-to-many med extra data)
CREATE TABLE gig_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  conductor TEXT,                -- "Herbert Blomstedt"
  notes TEXT,                    -- "Solo i 2:a satsen"
  sort_order INTEGER DEFAULT 0,  -- Ordning på programmet
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index för snabbare queries
CREATE INDEX idx_gig_works_gig ON gig_works(gig_id);
CREATE INDEX idx_gig_works_work ON gig_works(work_id);

-- Unik: samma verk kan inte läggas till flera gånger på samma gig
CREATE UNIQUE INDEX idx_gig_works_unique ON gig_works(gig_id, work_id);

-- Sökindex för kompositörer (för autocomplete)
CREATE INDEX idx_works_composer ON works(composer);
