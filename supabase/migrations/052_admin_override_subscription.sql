-- Add admin_override flag to subscriptions
-- When an admin manually sets a plan, this prevents Stripe sync from overwriting it.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT FALSE;

-- Update admin_set_user_tier to set admin_override = true
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

  SELECT company_id INTO target_company_id
  FROM subscriptions WHERE user_id = target_user_id;

  IF target_company_id IS NOT NULL THEN
    UPDATE subscriptions
    SET plan = new_plan, updated_at = NOW(), admin_override = TRUE
    WHERE company_id = target_company_id;
  ELSE
    UPDATE subscriptions
    SET plan = new_plan, updated_at = NOW(), admin_override = TRUE
    WHERE user_id = target_user_id;
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
