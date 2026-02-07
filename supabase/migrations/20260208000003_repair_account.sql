-- Fix Team Members RLS and Add Fallback
-- 1. Drop existing policies on team_members to be safe
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;

-- 2. Create looser policies for now (Read your own, or if you share a company)
-- Read your own
CREATE POLICY "Users can view own profile"
ON public.team_members FOR SELECT
TO authenticated
USING ( user_id = auth.uid() );

-- Read same company
CREATE POLICY "Users can view team members in same company"
ON public.team_members FOR SELECT
TO authenticated
USING ( company_id IN (
    SELECT company_id FROM public.team_members WHERE user_id = auth.uid()
));

-- 3. Fix the Auth Context "Loading Loop" issue
-- If a user exists in auth.users but has no team_members record (orphaned),
-- we should allow it to fail gracefully.
-- (This logic is handled in the frontend, but RLS must allow checking).
-- The above policies allow checking "my own profile". If it returns 0 rows, 
-- the frontend should handle it (Step 4 below manages the "Fix Account" logic).

-- 4. Utility function to "Repair" an account by creating a Default Company
-- Run this manually if you are stuck!
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

  -- Create Team Member
  INSERT INTO public.team_members (user_id, full_name, email, role, company_id)
  VALUES (
    auth.uid(),
    COALESCE(v_user_info.raw_user_meta_data->>'full_name', 'User'),
    v_user_info.email,
    'admin',
    new_company_id
  );

  -- Create Profile
  INSERT INTO public.profiles (user_id, full_name, email, company_id)
  VALUES (
    auth.uid(),
    COALESCE(v_user_info.raw_user_meta_data->>'full_name', 'User'),
    v_user_info.email,
    new_company_id
  );
  
  RETURN new_company_id;
END;
$$;
