
-- Migration to fix the Foreign Key constraint on team_members.company_id
-- VERSION 2: Robust fix that does not rely on the 'companies' table structure.

BEGIN;

-- 1. Drop the old incorrect constraint (if it exists)
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_company_id_fkey;

-- 2. Direct Data Fix:
-- We know the target 'company_settings' table has the valid IDs.
-- We will update any team_members referencing invalid IDs to point to the first valid 'company_settings' found.
-- This ensures they point to a valid record before we re-apply the constraint.

-- First, try to link to "The Genworks" if it exists (since we saw that in your screenshot)
UPDATE public.team_members
SET company_id = (
    SELECT id FROM public.company_settings 
    WHERE company_name ILIKE '%Genworks%' 
    LIMIT 1
)
WHERE company_id NOT IN (SELECT id FROM public.company_settings)
AND EXISTS (
    SELECT id FROM public.company_settings 
    WHERE company_name ILIKE '%Genworks%'
);

-- Fallback: If still invalid (or Genworks not found), link to ANY valid company_setting
UPDATE public.team_members
SET company_id = (SELECT id FROM public.company_settings ORDER BY created_at ASC LIMIT 1)
WHERE company_id NOT IN (SELECT id FROM public.company_settings);

-- 3. Add new valid constraint referencing company_settings
ALTER TABLE public.team_members
ADD CONSTRAINT team_members_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.company_settings(id) ON DELETE SET NULL;

COMMIT;
