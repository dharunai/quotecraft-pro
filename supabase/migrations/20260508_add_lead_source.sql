-- Add lead_source column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'Website';

-- Add a comment to the column
COMMENT ON COLUMN public.leads.lead_source IS 'The source where the lead originated from (e.g., Website, Referral, Cold Call)';
