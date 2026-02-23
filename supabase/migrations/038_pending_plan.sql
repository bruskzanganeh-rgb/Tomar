-- Add pending_plan column for scheduled downgrades
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pending_plan text DEFAULT NULL;
