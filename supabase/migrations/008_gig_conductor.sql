-- Flytta conductor från gig_works till gigs (en dirigent per projekt)
ALTER TABLE gigs ADD COLUMN conductor TEXT;

-- Migrera befintlig data: ta första dirigenten från gig_works
UPDATE gigs g
SET conductor = (
  SELECT gw.conductor
  FROM gig_works gw
  WHERE gw.gig_id = g.id AND gw.conductor IS NOT NULL
  LIMIT 1
);
