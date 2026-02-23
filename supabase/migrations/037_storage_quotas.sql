-- ============================================================
-- Migration 037: Storage quotas and improved isolation
--
-- 1. Add file_size column to expenses table
-- 2. Clean up storage RLS policies (rename for clarity)
-- ============================================================

-- 1. Add file_size to expenses for storage tracking
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- 2. Drop old generic storage policies and recreate with clear names
-- gig-attachments bucket
DROP POLICY IF EXISTS "gig_attachments_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "gig_attachments_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "gig_attachments_auth_delete" ON storage.objects;

CREATE POLICY "gig_att_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gig-attachments');
CREATE POLICY "gig_att_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gig-attachments');
CREATE POLICY "gig_att_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gig-attachments');

-- expenses bucket
DROP POLICY IF EXISTS "expenses_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "expenses_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "expenses_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "expenses_auth_update" ON storage.objects;

CREATE POLICY "exp_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expenses');
CREATE POLICY "exp_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'expenses');
CREATE POLICY "exp_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'expenses');
CREATE POLICY "exp_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'expenses');
