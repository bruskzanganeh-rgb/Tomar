-- Fix: circular RLS dependency on company_members
-- The existing policy "Members can see co-members" uses get_user_company_id()
-- which itself queries company_members → circular → returns null for new members.
-- This policy lets users always read their own membership row.

CREATE POLICY "Users can read own membership"
  ON company_members FOR SELECT
  USING (auth.uid() = user_id);
