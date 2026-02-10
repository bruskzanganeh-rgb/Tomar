-- Add English name column to gig_types for multilingual invoice support
ALTER TABLE gig_types ADD COLUMN IF NOT EXISTS name_en TEXT;

-- Populate default types with English names
UPDATE gig_types SET name_en = 'Concert' WHERE name = 'Konsert' AND is_default = true;
UPDATE gig_types SET name_en = 'Recording' WHERE name = 'Inspelning' AND is_default = true;
UPDATE gig_types SET name_en = 'Teaching' WHERE name = 'Undervisning' AND is_default = true;
