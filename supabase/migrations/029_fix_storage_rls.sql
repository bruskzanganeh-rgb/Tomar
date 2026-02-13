-- Fix storage bucket RLS policies
-- gig-attachments bucket only had policies for anon role, not authenticated
-- expenses bucket had NO policies at all

-- gig-attachments: add authenticated user policies
CREATE POLICY "gig_attachments_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gig-attachments');

CREATE POLICY "gig_attachments_auth_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'gig-attachments');

CREATE POLICY "gig_attachments_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gig-attachments');

-- expenses: add authenticated user policies
CREATE POLICY "expenses_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expenses');

CREATE POLICY "expenses_auth_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'expenses');

CREATE POLICY "expenses_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'expenses');

CREATE POLICY "expenses_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'expenses');
