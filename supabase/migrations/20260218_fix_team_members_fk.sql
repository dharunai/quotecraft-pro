
-- Migration to fix the Foreign Key constraint on team_members.company_id
-- Previous constraint referenced 'companies', but 'integrations' uses 'company_settings'.
-- We need team_members to also reference 'company_settings' to ensure data consistency.

BEGIN;

-- 1. Drop the old incorrect constraint
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_company_id_fkey;

-- 2. Update existing team_members to point to valid company_settings IDs based on matching names
-- Attempt to match by name from old 'companies' table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'companies') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'name') THEN
            UPDATE public.team_members tm
            SET company_id = cs.id
            FROM public.companies c, public.company_settings cs
            WHERE tm.company_id = c.id
            AND c.name = cs.company_name;
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'company_name') THEN
            UPDATE public.team_members tm
            SET company_id = cs.id
            FROM public.companies c, public.company_settings cs
            WHERE tm.company_id = c.id
            AND c.company_name = cs.company_name;
        END IF;
    END IF;
END $$;

-- 3. Fallback: Update any remaining invalid company_ids to the first valid company_settings ID
UPDATE public.team_members
SET company_id = (SELECT id FROM public.company_settings ORDER BY created_at ASC LIMIT 1)
WHERE company_id NOT IN (SELECT id FROM public.company_settings);

-- 4. Add new correct constraint referencing company_settings
ALTER TABLE public.team_members
ADD CONSTRAINT team_members_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.company_settings(id) ON DELETE SET NULL;

COMMIT;
