-- Trigger: automatically inherit company_id and user_id from parent gig
-- when gig_dates are inserted without them (e.g. via service role key)

CREATE OR REPLACE FUNCTION gig_dates_inherit_from_gig()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL OR NEW.user_id IS NULL THEN
    SELECT
      COALESCE(NEW.company_id, g.company_id),
      COALESCE(NEW.user_id, g.user_id)
    INTO NEW.company_id, NEW.user_id
    FROM gigs g WHERE g.id = NEW.gig_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gig_dates_inherit_company
  BEFORE INSERT ON gig_dates
  FOR EACH ROW
  EXECUTE FUNCTION gig_dates_inherit_from_gig();

-- Fix all existing gig_dates missing company_id or user_id
UPDATE gig_dates gd
SET company_id = g.company_id, user_id = g.user_id
FROM gigs g
WHERE gd.gig_id = g.id
  AND (gd.company_id IS NULL OR gd.user_id IS NULL);
