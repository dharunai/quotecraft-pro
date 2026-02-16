-- 1. Fix Departments Data: Align company_id with the manager's profile
UPDATE public.departments d
SET company_id = p.company_id
FROM public.profiles p
WHERE d.manager_id = p.id
AND d.company_id != p.company_id;

-- 2. Enable RLS on departments (ensure it is on)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing permissive policies on departments
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.departments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.departments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.departments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.departments;

-- 4. Apply Tenant Isolation to departments using the helper procedure
CALL public.apply_tenant_isolation_policy('departments');


-- 5. Fix Team Members RLS: Remove permissive 'true' policy
DROP POLICY IF EXISTS "Authenticated users can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own profile" ON public.team_members; 
-- Note: 'Users can view own profile' on team_members might be useful if they are not in the company yet? 
-- But Tenant Isolation covers "viewing" if they are in the company.
-- If they are just invited, they might need access? 
-- Let's keep a specific policy for "Users can view themselves" just in case.
CREATE POLICY "Users can view their own team membership" ON public.team_members
FOR SELECT USING (user_id = auth.uid());


-- 6. Ensure existing "Tenant Isolation" policies on team_members are correct/refreshed
CALL public.apply_tenant_isolation_policy('team_members');

-- 7. Grant access to authenticated users for the table itself (RLS handles rows)
GRANT ALL ON TABLE public.departments TO authenticated;
