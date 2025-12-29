-- Migration: Lägg till stöd för kvittobilagor på utgifter
-- Originalbilder sparas i Supabase Storage och synkas till Dropbox

-- Lägg till kolumner för attachment och Dropbox-sync
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS dropbox_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS dropbox_path TEXT;

-- Index för att snabbt hitta osynkade kvitton
CREATE INDEX IF NOT EXISTS idx_expenses_dropbox_synced ON expenses(dropbox_synced) WHERE dropbox_synced = FALSE;
