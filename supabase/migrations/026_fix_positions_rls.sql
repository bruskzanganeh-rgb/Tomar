-- Fix: positions table had RLS policy defined but RLS was never enabled.
-- Migration 016 created the "Users own positions" policy but forgot
-- ALTER TABLE positions ENABLE ROW LEVEL SECURITY.
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
