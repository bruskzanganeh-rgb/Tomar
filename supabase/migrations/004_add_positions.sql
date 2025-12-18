-- Create positions table for tracking musician roles/positions
CREATE TABLE IF NOT EXISTS positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add position_id to gigs table (nullable - positions are optional)
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gigs_position_id ON gigs(position_id);

-- Insert default positions
INSERT INTO positions (name, sort_order) VALUES
  ('1:a konsertmästare', 1),
  ('2:a konsertmästare', 2),
  ('3:e konsertmästare', 3),
  ('Stämledare', 4),
  ('Alternerande stämledare', 5),
  ('Tutti', 6),
  ('Violin 2 tutti', 7),
  ('Kammarmusik', 8),
  ('Pop gig', 9)
ON CONFLICT (name) DO NOTHING;
