-- Optimize gig_dates trigger: O(N²) → O(1) per statement
-- Before: FOR EACH ROW trigger ran 3 subqueries per inserted/deleted row
-- After: FOR EACH STATEMENT trigger runs once per batch operation

-- Drop the old per-row trigger
DROP TRIGGER IF EXISTS trigger_update_gig_date_summary ON gig_dates;

-- Create optimized statement-level function
CREATE OR REPLACE FUNCTION update_gig_date_summary_stmt()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gigs g SET
    start_date = sub.min_date,
    end_date = sub.max_date,
    total_days = sub.cnt,
    updated_at = NOW()
  FROM (
    SELECT gd.gig_id, MIN(gd.date) as min_date, MAX(gd.date) as max_date, COUNT(*) as cnt
    FROM gig_dates gd
    WHERE gd.gig_id IN (SELECT DISTINCT gig_id FROM affected_rows)
    GROUP BY gd.gig_id
  ) sub
  WHERE g.id = sub.gig_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Handle gigs that had ALL their dates deleted (set to NULL)
CREATE OR REPLACE FUNCTION update_gig_date_summary_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- First update gigs that still have dates
  UPDATE gigs g SET
    start_date = sub.min_date,
    end_date = sub.max_date,
    total_days = sub.cnt,
    updated_at = NOW()
  FROM (
    SELECT gd.gig_id, MIN(gd.date) as min_date, MAX(gd.date) as max_date, COUNT(*) as cnt
    FROM gig_dates gd
    WHERE gd.gig_id IN (SELECT DISTINCT gig_id FROM deleted_rows)
    GROUP BY gd.gig_id
  ) sub
  WHERE g.id = sub.gig_id;

  -- Then null out gigs that have no dates left
  UPDATE gigs SET
    start_date = NULL,
    end_date = NULL,
    total_days = 0,
    updated_at = NOW()
  WHERE id IN (SELECT DISTINCT gig_id FROM deleted_rows)
    AND NOT EXISTS (SELECT 1 FROM gig_dates WHERE gig_dates.gig_id = gigs.id);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create separate statement-level triggers for each operation
CREATE TRIGGER trigger_gig_date_summary_insert
AFTER INSERT ON gig_dates
REFERENCING NEW TABLE AS affected_rows
FOR EACH STATEMENT EXECUTE FUNCTION update_gig_date_summary_stmt();

CREATE TRIGGER trigger_gig_date_summary_update
AFTER UPDATE ON gig_dates
REFERENCING NEW TABLE AS affected_rows
FOR EACH STATEMENT EXECUTE FUNCTION update_gig_date_summary_stmt();

CREATE TRIGGER trigger_gig_date_summary_delete
AFTER DELETE ON gig_dates
REFERENCING OLD TABLE AS deleted_rows
FOR EACH STATEMENT EXECUTE FUNCTION update_gig_date_summary_delete();
