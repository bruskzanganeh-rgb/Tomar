-- Add personal name (first + last) to company_members
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Allow users to update their own row, and owners to update any member in their company
CREATE POLICY "Members can update own or owners can update any"
  ON company_members
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = company_members.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
  );
