-- Fix: ai_usage_logs had RLS policy defined but RLS was never enabled.
-- Same issue as positions (fixed in 026).
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
