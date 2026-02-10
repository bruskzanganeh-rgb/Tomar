-- Ta bort repertoar-tabeller och dirigent-kolumn

-- Drop gig_works first (references works)
DROP TABLE IF EXISTS gig_works CASCADE;

-- Drop works table
DROP TABLE IF EXISTS works CASCADE;

-- Drop conductor column from gigs
ALTER TABLE gigs DROP COLUMN IF EXISTS conductor;
