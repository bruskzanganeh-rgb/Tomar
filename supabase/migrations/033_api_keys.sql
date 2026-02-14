-- API keys for programmatic REST API access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT api_keys_name_not_empty CHECK (char_length(name) > 0),
  CONSTRAINT api_keys_scopes_valid CHECK (
    scopes <@ ARRAY[
      'read:gigs', 'write:gigs',
      'read:invoices', 'write:invoices',
      'read:clients', 'write:clients',
      'read:expenses', 'write:expenses'
    ]::TEXT[]
  )
);

-- Index for fast key lookup
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own api_keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
