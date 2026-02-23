-- Add 'schedule' to gig_attachments category constraint
ALTER TABLE gig_attachments
DROP CONSTRAINT IF EXISTS gig_attachments_category_check;

ALTER TABLE gig_attachments
ADD CONSTRAINT gig_attachments_category_check
CHECK (category IN ('gig_info', 'invoice_doc', 'schedule'));
