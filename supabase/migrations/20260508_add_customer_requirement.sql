-- Add customer_requirement column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_requirement TEXT;

-- Add a comment to the column
COMMENT ON COLUMN public.leads.customer_requirement IS 'Specific requirements or needs mentioned by the customer during initial contact.';
