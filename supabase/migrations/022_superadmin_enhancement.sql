-- Migration 022: Superadmin Enhancement
-- Adds audit logging, activity events, session tracking, and organization management

-- ============================================================
-- 1. AUDIT LOGS TABLE (automatic change capture via triggers)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);

-- ============================================================
-- 2. ACTIVITY EVENTS TABLE (meaningful user actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_events_user ON activity_events(user_id);
CREATE INDEX idx_activity_events_type ON activity_events(event_type);
CREATE INDEX idx_activity_events_created ON activity_events(created_at DESC);
CREATE INDEX idx_activity_events_entity ON activity_events(entity_type, entity_id);

-- ============================================================
-- 3. USER SESSIONS TABLE (login/activity tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, ended_at) WHERE ended_at IS NULL;
CREATE INDEX idx_user_sessions_started ON user_sessions(started_at DESC);

-- ============================================================
-- 4. ORGANIZATIONS TABLE (admin grouping of users)
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. ORGANIZATION MEMBERS (junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================================
-- 6. AUDIT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  rec_id TEXT;
  changed TEXT[];
  uid UUID;
  old_json JSONB;
  new_json JSONB;
BEGIN
  -- Build JSONB from old/new records
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    old_json := to_jsonb(OLD);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    new_json := to_jsonb(NEW);
  END IF;

  -- Get record ID
  IF TG_OP = 'DELETE' THEN
    rec_id := (old_json->>'id');
    uid := CASE WHEN old_json ? 'user_id' THEN (old_json->>'user_id')::UUID ELSE NULL END;
  ELSE
    rec_id := (new_json->>'id');
    uid := CASE WHEN new_json ? 'user_id' THEN (new_json->>'user_id')::UUID ELSE NULL END;
  END IF;

  -- Calculate changed fields for updates
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO changed
    FROM jsonb_each(new_json) AS n(key, value)
    WHERE n.value IS DISTINCT FROM (old_json->n.key);
  END IF;

  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_fields, user_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(rec_id, 'unknown'),
    TG_OP,
    old_json,
    new_json,
    changed,
    uid
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. APPLY TRIGGERS TO MAJOR TABLES
-- ============================================================
CREATE TRIGGER audit_gigs AFTER INSERT OR UPDATE OR DELETE ON gigs
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_invoice_lines AFTER INSERT OR UPDATE OR DELETE ON invoice_lines
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_company_settings AFTER INSERT OR UPDATE OR DELETE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_subscriptions AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_gig_types AFTER INSERT OR UPDATE OR DELETE ON gig_types
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_positions AFTER INSERT OR UPDATE OR DELETE ON positions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_gig_dates AFTER INSERT OR UPDATE OR DELETE ON gig_dates
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================
-- 8. ADMIN SET USER TIER RPC
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_user_tier(
  admin_uid UUID,
  target_user_id UUID,
  new_plan subscription_plan
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_admin(admin_uid) THEN
    RETURN FALSE;
  END IF;

  UPDATE subscriptions
  SET plan = new_plan, updated_at = NOW()
  WHERE user_id = target_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. RLS POLICIES
-- ============================================================

-- audit_logs: admin-only read, trigger writes bypass RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- activity_events: admin-only read, service role writes
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read activity_events" ON activity_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- user_sessions: admin-only read, service role writes
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read user_sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- organizations: admin-only full access
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage organizations" ON organizations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- organization_members: admin-only full access
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage organization_members" ON organization_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
