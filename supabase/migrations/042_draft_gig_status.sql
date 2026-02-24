-- Add 'draft' status to gig_status enum
-- Draft gigs are created when the gig dialog opens, allowing file uploads before saving
ALTER TYPE gig_status ADD VALUE IF NOT EXISTS 'draft';
