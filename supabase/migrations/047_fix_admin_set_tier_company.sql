-- Fix admin_set_user_tier to update ALL subscriptions in a company
-- Previously only updated the target user's row, leaving team members
-- on their old plan when the company tier was changed.

CREATE OR REPLACE FUNCTION admin_set_user_tier(
  admin_uid UUID,
  target_user_id UUID,
  new_plan subscription_plan
)
RETURNS BOOLEAN AS $$
DECLARE
  target_company_id UUID;
BEGIN
  IF NOT is_admin(admin_uid) THEN
    RETURN FALSE;
  END IF;

  -- Get company_id from target user's subscription
  SELECT company_id INTO target_company_id
  FROM subscriptions WHERE user_id = target_user_id;

  -- Update ALL subscriptions in the company (owner + members)
  IF target_company_id IS NOT NULL THEN
    UPDATE subscriptions
    SET plan = new_plan, updated_at = NOW()
    WHERE company_id = target_company_id;
  ELSE
    -- No company — just update the single user
    UPDATE subscriptions
    SET plan = new_plan, updated_at = NOW()
    WHERE user_id = target_user_id;
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
