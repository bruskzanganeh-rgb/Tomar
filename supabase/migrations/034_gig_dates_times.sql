-- Add schedule text and structured sessions to gig_dates
ALTER TABLE gig_dates
  ADD COLUMN schedule_text TEXT,
  ADD COLUMN sessions JSONB DEFAULT '[]';
