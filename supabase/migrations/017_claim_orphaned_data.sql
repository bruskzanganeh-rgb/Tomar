-- Function to assign all orphaned data (user_id IS NULL) to a given user.
-- Uses SECURITY DEFINER to bypass RLS (which blocks access to NULL user_id rows).
-- Called once during first signup to claim pre-existing data.

CREATE OR REPLACE FUNCTION claim_orphaned_data(uid UUID)
RETURNS void AS $$
BEGIN
  UPDATE clients SET user_id = uid WHERE user_id IS NULL;
  UPDATE gigs SET user_id = uid WHERE user_id IS NULL;
  UPDATE gig_dates SET user_id = uid WHERE user_id IS NULL;
  UPDATE gig_types SET user_id = uid WHERE user_id IS NULL;
  UPDATE gig_attachments SET user_id = uid WHERE user_id IS NULL;
  UPDATE positions SET user_id = uid WHERE user_id IS NULL;
  UPDATE invoices SET user_id = uid WHERE user_id IS NULL;
  UPDATE invoice_lines SET user_id = uid WHERE user_id IS NULL;
  UPDATE invoice_gigs SET user_id = uid WHERE user_id IS NULL;
  UPDATE expenses SET user_id = uid WHERE user_id IS NULL;
  UPDATE company_settings SET user_id = uid WHERE user_id IS NULL;
  UPDATE exchange_rates SET user_id = uid WHERE user_id IS NULL;
  UPDATE contacts SET user_id = uid WHERE user_id IS NULL;
  UPDATE ai_usage_logs SET user_id = uid WHERE user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
