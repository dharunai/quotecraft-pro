-- 1. Helper function to get current user's role (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.team_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 2. Helper function to get current company ID (Security Definer)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.team_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 3. Update Profiles RLS - Update Policy
DROP POLICY IF EXISTS "Admins and Owners can update company profiles" ON public.profiles;

CREATE POLICY "Admins and Owners can update company profiles" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- User must be in the same company as the profile being updated
  company_id = public.get_my_company_id()
  AND (
    -- User must be admin/owner/manager
    public.get_my_role() IN ('admin', 'owner', 'manager')
    OR
    -- Or user has explicit permission (checked via function or direct if safe)
    -- To avoid recursion, we'll rely on the team_members role primarily.
    (SELECT can_assign_tasks FROM public.profiles WHERE user_id = auth.uid()) IS TRUE
  )
);

-- 4. Update Departments RLS to use the new safe function
DROP POLICY IF EXISTS "Tenant Isolation Select departments" ON public.departments;
CREATE POLICY "Tenant Isolation Select departments" ON public.departments 
FOR SELECT USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Tenant Isolation Insert departments" ON public.departments;
CREATE POLICY "Tenant Isolation Insert departments" ON public.departments 
FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Tenant Isolation Update departments" ON public.departments;
CREATE POLICY "Tenant Isolation Update departments" ON public.departments 
FOR UPDATE USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Tenant Isolation Delete departments" ON public.departments;
CREATE POLICY "Tenant Isolation Delete departments" ON public.departments 
FOR DELETE USING (company_id = public.get_my_company_id());

-- 5. Grant access to public for get_my_role and get_my_company_id (execution)
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;
