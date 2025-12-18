-- Migration: Add gig attachments support
-- Creates storage bucket and attachments table for PDF uploads

-- 1. Create storage bucket for gig attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('gig-attachments', 'gig-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policy for uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gig-attachments');

-- 3. RLS policy for reads
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'gig-attachments');

-- 4. RLS policy for deletes
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gig-attachments');

-- 5. Create table for attachment metadata
CREATE TABLE IF NOT EXISTS gig_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_gig_attachments_gig_id ON gig_attachments(gig_id);
