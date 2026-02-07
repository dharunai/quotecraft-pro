-- MASTE SETUP SCRIPT
-- Run this in Supabase Dashboard > SQL Editor to fix everything at once.

-- 1. Create the exec_sql helper (allows us to run migrations automatically in future)
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- 2. Add Multi-tenancy Columns (Safe to run multiple times)
ALTER TABLE IF EXISTS public.team_members 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.company_settings(id);

DO $$ 
DECLARE 
    t text;
BEGIN 
    FOREACH t IN ARRAY ARRAY['leads', 'deals', 'quotations', 'invoices', 'products', 'tasks', 'workflow_templates', 'automation_rules', 'notifications', 'email_logs', 'profiles'] 
    LOOP 
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.company_settings(id)', t);
    END LOOP; 
END $$;

-- 3. Create Repair Account Function
CREATE OR REPLACE FUNCTION public.repair_my_account(company_name_input TEXT DEFAULT 'My Company')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_company_id UUID;
  v_user_info RECORD;
BEGIN
  -- Get current user details
  SELECT * INTO v_user_info FROM auth.users WHERE id = auth.uid();
  
  IF v_user_info IS NULL THEN
     RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create a new Company
  INSERT INTO public.company_settings (company_name, email, currency)
  VALUES (company_name_input, v_user_info.email, '₹')
  RETURNING id INTO new_company_id;

  -- Create Team Member (Admin)
  INSERT INTO public.team_members (user_id, full_name, email, role, company_id)
  VALUES (
    auth.uid(),
    COALESCE(v_user_info.raw_user_meta_data->>'full_name', 'User'),
    v_user_info.email,
    'admin',
    new_company_id
  );

  -- Create Profile if missing
  INSERT INTO public.profiles (user_id, full_name, email, company_id)
  VALUES (
    auth.uid(),
    COALESCE(v_user_info.raw_user_meta_data->>'full_name', 'User'),
    v_user_info.email,
    new_company_id
  ) ON CONFLICT (user_id) DO UPDATE SET company_id = EXCLUDED.company_id;
  
  RETURN new_company_id;
END;
$$;

-- 4. Fix Permissions (Safe Drops)
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own profile" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members in same company" ON public.team_members;

CREATE POLICY "Users can view own profile"
ON public.team_members FOR SELECT
TO authenticated
USING ( user_id = auth.uid() );

CREATE POLICY "Users can view team members in same company"
ON public.team_members FOR SELECT
TO authenticated
USING ( company_id IN (
    SELECT company_id FROM public.team_members WHERE user_id = auth.uid()
));

-- 5. RELOAD SCHEMA CACHE (By notifying)
NOTIFY pgrst, 'reload config';
