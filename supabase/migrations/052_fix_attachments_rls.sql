-- Fix: gig_attachments has an overly permissive anon policy granting full CRUD.
-- No public endpoint accesses this table without auth, so anon access is not needed.
-- Drop the broad policy and keep only the authenticated company-scoped policy.

DROP POLICY IF EXISTS "gig_attachments_all" ON gig_attachments;
