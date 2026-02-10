-- Instruments, Subscriptions, Sponsors, Admin, Onboarding
-- Part of SaaS/freemium support

-----------------------------------------------------------
-- Helper: updated_at trigger function
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------------------------
-- 1. Instrument Categories (static reference data)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS instrument_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO instrument_categories (name, slug, sort_order) VALUES
  ('Stråk', 'strak', 1),
  ('Blås', 'blas', 2),
  ('Mässing', 'massing', 3),
  ('Slagverk', 'slagverk', 4),
  ('Övrigt', 'ovrigt', 5)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE instrument_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read instrument_categories"
  ON instrument_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-----------------------------------------------------------
-- 2. Instruments (static reference data)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES instrument_categories(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stråk
INSERT INTO instruments (name, category_id, sort_order)
SELECT unnest(ARRAY['Violin', 'Viola', 'Cello', 'Kontrabas']),
       id,
       unnest(ARRAY[1, 2, 3, 4])
FROM instrument_categories WHERE slug = 'strak'
ON CONFLICT (name) DO NOTHING;

-- Blås
INSERT INTO instruments (name, category_id, sort_order)
SELECT unnest(ARRAY['Flöjt', 'Oboe', 'Klarinett', 'Fagott']),
       id,
       unnest(ARRAY[1, 2, 3, 4])
FROM instrument_categories WHERE slug = 'blas'
ON CONFLICT (name) DO NOTHING;

-- Mässing
INSERT INTO instruments (name, category_id, sort_order)
SELECT unnest(ARRAY['Trumpet', 'Valthorn', 'Trombon', 'Tuba']),
       id,
       unnest(ARRAY[1, 2, 3, 4])
FROM instrument_categories WHERE slug = 'massing'
ON CONFLICT (name) DO NOTHING;

-- Slagverk
INSERT INTO instruments (name, category_id, sort_order)
SELECT unnest(ARRAY['Timpani', 'Slagverk']),
       id,
       unnest(ARRAY[1, 2])
FROM instrument_categories WHERE slug = 'slagverk'
ON CONFLICT (name) DO NOTHING;

-- Övrigt
INSERT INTO instruments (name, category_id, sort_order)
SELECT unnest(ARRAY['Piano', 'Harpa', 'Sång']),
       id,
       unnest(ARRAY[1, 2, 3])
FROM instrument_categories WHERE slug = 'ovrigt'
ON CONFLICT (name) DO NOTHING;

ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read instruments"
  ON instruments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-----------------------------------------------------------
-- 3. User Instruments (junction table)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_instruments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, instrument_id)
);

CREATE INDEX IF NOT EXISTS idx_user_instruments_user_id ON user_instruments(user_id);

ALTER TABLE user_instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their instruments"
  ON user_instruments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-----------------------------------------------------------
-- 4. Subscriptions
-----------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their subscription"
  ON subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-----------------------------------------------------------
-- 5. Usage Tracking
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  invoice_count INTEGER NOT NULL DEFAULT 0,
  receipt_scan_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);

ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their usage"
  ON usage_tracking FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-----------------------------------------------------------
-- 6. Sponsors
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  tagline TEXT,
  website_url TEXT,
  instrument_category_id UUID NOT NULL REFERENCES instrument_categories(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_category ON sponsors(instrument_category_id);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read active sponsors"
  ON sponsors FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-----------------------------------------------------------
-- 7. Sponsor Impressions
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsor_impressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_impressions_sponsor ON sponsor_impressions(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_impressions_user ON sponsor_impressions(user_id);

ALTER TABLE sponsor_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their impressions"
  ON sponsor_impressions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-----------------------------------------------------------
-- 8. Admin Users
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read admin_users"
  ON admin_users FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()));

-- Helper function
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE user_id = uid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-----------------------------------------------------------
-- 9. Onboarding flag on company_settings
-----------------------------------------------------------
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
