-- Migration: 002_add_multi_day_gigs.sql
-- Adds support for multi-day gigs

-- 1. Add new columns to gigs table for date range summary
ALTER TABLE gigs
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE,
  ADD COLUMN total_days INTEGER DEFAULT 1;

-- 2. Create gig_dates table for storing individual dates
CREATE TABLE gig_dates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gig_id, date)
);

-- 3. Create indexes for performance
CREATE INDEX idx_gig_dates_gig_id ON gig_dates(gig_id);
CREATE INDEX idx_gig_dates_date ON gig_dates(date);

-- 4. Enable RLS
ALTER TABLE gig_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON gig_dates FOR ALL USING (true);

-- 5. Migrate existing gigs to gig_dates (create one date entry per existing gig)
INSERT INTO gig_dates (gig_id, date)
SELECT id, date::DATE FROM gigs WHERE date IS NOT NULL;

-- 6. Update summary columns for existing gigs
UPDATE gigs
SET
  start_date = date::DATE,
  end_date = date::DATE,
  total_days = 1
WHERE date IS NOT NULL;

-- 7. Create trigger function to keep summary columns in sync
CREATE OR REPLACE FUNCTION update_gig_date_summary()
RETURNS TRIGGER AS $$
DECLARE
  target_gig_id UUID;
BEGIN
  -- Determine which gig to update
  IF TG_OP = 'DELETE' THEN
    target_gig_id := OLD.gig_id;
  ELSE
    target_gig_id := NEW.gig_id;
  END IF;

  -- Update the gig's summary columns
  UPDATE gigs
  SET
    start_date = (SELECT MIN(date) FROM gig_dates WHERE gig_id = target_gig_id),
    end_date = (SELECT MAX(date) FROM gig_dates WHERE gig_id = target_gig_id),
    total_days = (SELECT COUNT(*) FROM gig_dates WHERE gig_id = target_gig_id),
    updated_at = NOW()
  WHERE id = target_gig_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger
CREATE TRIGGER trigger_update_gig_date_summary
AFTER INSERT OR UPDATE OR DELETE ON gig_dates
FOR EACH ROW EXECUTE FUNCTION update_gig_date_summary();
