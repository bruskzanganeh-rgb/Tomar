-- Payment reminders for overdue invoices
CREATE TABLE IF NOT EXISTS invoice_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  sent_to TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT,
  reminder_number INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice_id ON invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_user_id ON invoice_reminders(user_id);

ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own invoice_reminders" ON invoice_reminders
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
