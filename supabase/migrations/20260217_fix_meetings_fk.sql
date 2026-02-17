-- Fix meetings table: Change company_id FK from company_settings(id) to companies(id)
-- This aligns meetings with the multi-tenancy model used by all other tables.

-- 1. Drop the old FK constraint pointing to company_settings
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_company_id_fkey;

-- 2. Drop the old RLS policy that used get_user_company_id (which queries team_members)
DROP POLICY IF EXISTS "Users can view meetings of their company" ON public.meetings;

-- 3. Backfill: set company_id for any meetings that have NULL or invalid company_id
DO $$
DECLARE
    default_company_id UUID;
BEGIN
    SELECT id INTO default_company_id FROM public.companies LIMIT 1;
    IF default_company_id IS NOT NULL THEN
        UPDATE public.meetings SET company_id = default_company_id WHERE company_id IS NULL;
        UPDATE public.meetings SET company_id = default_company_id
            WHERE company_id NOT IN (SELECT id FROM public.companies);
    END IF;
END $$;

-- 4. Add new FK pointing to companies(id)
ALTER TABLE public.meetings
ADD CONSTRAINT meetings_company_id_fkey
FOREIGN KEY (company_id) REFERENCES public.companies(id);

-- 5. Apply tenant isolation RLS (same pattern as all other tables)
DROP POLICY IF EXISTS "Tenant Isolation Select meetings" ON public.meetings;
CREATE POLICY "Tenant Isolation Select meetings" ON public.meetings
FOR SELECT TO authenticated
USING (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "Tenant Isolation Insert meetings" ON public.meetings;
CREATE POLICY "Tenant Isolation Insert meetings" ON public.meetings
FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "Tenant Isolation Update meetings" ON public.meetings;
CREATE POLICY "Tenant Isolation Update meetings" ON public.meetings
FOR UPDATE TO authenticated
USING (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "Tenant Isolation Delete meetings" ON public.meetings;
CREATE POLICY "Tenant Isolation Delete meetings" ON public.meetings
FOR DELETE TO authenticated
USING (company_id = public.get_current_company_id());

-- 6. Also fix meeting_participants RLS
DROP POLICY IF EXISTS "Tenant Isolation Select meeting_participants" ON public.meeting_participants;
CREATE POLICY "Participants viewable by meeting owner" ON public.meeting_participants
FOR ALL TO authenticated
USING (
    meeting_id IN (
        SELECT id FROM public.meetings WHERE company_id = public.get_current_company_id()
    )
);
