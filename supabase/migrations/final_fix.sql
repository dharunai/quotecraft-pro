
-- Final Fix for Signup Error

-- 1. Update Trigger Function (Refactored logic: Company -> Profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
    new_company_id UUID;
    meta_company_name TEXT;
    meta_full_name TEXT;
BEGIN
    meta_company_name := NEW.raw_user_meta_data ->> 'company_name';
    meta_full_name := NEW.raw_user_meta_data ->> 'full_name';

    -- Logic for Company:
    IF meta_company_name IS NOT NULL THEN
        -- 1. Create Company First
        INSERT INTO public.companies (name)
        VALUES (meta_company_name)
        RETURNING id INTO new_company_id;
        
        -- 2. Create Profile WITH company_id
        INSERT INTO public.profiles (user_id, email, full_name, company_id)
        VALUES (NEW.id, NEW.email, meta_full_name, new_company_id);

        -- 3. Create Admin Team Member
        INSERT INTO public.team_members (company_id, user_id, full_name, email, role)
        VALUES (new_company_id, NEW.id, COALESCE(meta_full_name, 'Admin'), NEW.email, 'admin');

        -- 4. Create Default Company Settings
        INSERT INTO public.company_settings (company_id, company_name, email)
        VALUES (new_company_id, meta_company_name, NEW.email);
        
    ELSE
        -- Fallback: Just create profile without company (Company ID is nullable or handle later)
        INSERT INTO public.profiles (user_id, email, full_name)
        VALUES (NEW.id, NEW.email, meta_full_name);
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error (if we had a log table) but raise to ensure signup fails
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RAISE;
END;
$$;

-- 2. Fix Permissions (Ensure trigger has access)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.companies TO postgres, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT ALL ON TABLE public.team_members TO postgres, service_role;
GRANT ALL ON TABLE public.company_settings TO postgres, service_role;

-- 3. Update Profiles Constraint to DEFERRABLE (Fixes "unexpected_failure" during transaction)
-- First clean up any potential bad data from failed attempts
UPDATE public.profiles SET company_id = NULL WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM public.companies);

ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_company_id_fkey 
  FOREIGN KEY (company_id) 
  REFERENCES public.companies(id)
  DEFERRABLE INITIALLY DEFERRED;

-- 4. Cleanup Debug Artifacts
DROP TABLE IF EXISTS public.debug_logs;
