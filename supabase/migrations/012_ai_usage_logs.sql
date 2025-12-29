-- AI Usage Logs - Track all AI API calls for cost monitoring
CREATE TABLE ai_usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_type TEXT NOT NULL,  -- 'receipt_scan_text', 'receipt_scan_vision', 'document_classify_text', 'document_classify_vision', 'invoice_parse'
  model TEXT NOT NULL,       -- 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307'
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost_usd DECIMAL(10,6) NOT NULL,
  metadata JSONB  -- Extra info: filename, confidence, etc.
);

-- Index for efficient querying by date
CREATE INDEX idx_ai_usage_created_at ON ai_usage_logs(created_at DESC);

-- Index for filtering by type
CREATE INDEX idx_ai_usage_type ON ai_usage_logs(usage_type);

-- Comment for documentation
COMMENT ON TABLE ai_usage_logs IS 'Logs all AI API calls for cost monitoring and analytics';
COMMENT ON COLUMN ai_usage_logs.usage_type IS 'Type of AI operation: receipt_scan_text, receipt_scan_vision, document_classify_text, document_classify_vision, invoice_parse';
COMMENT ON COLUMN ai_usage_logs.estimated_cost_usd IS 'Estimated cost in USD based on Anthropic pricing';
