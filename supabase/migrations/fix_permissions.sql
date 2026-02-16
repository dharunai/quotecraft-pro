-- Fix permissions for the trigger function
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.companies TO postgres, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT ALL ON TABLE public.team_members TO postgres, service_role;
GRANT ALL ON TABLE public.company_settings TO postgres, service_role;

-- Allow authenticated users to insert into companies (via the trigger which runs as owner, but checking anyway)
-- The function is SECURITY DEFINER, so it runs as the owner (likely postgres).
-- But let's verify if RLS is blocking the owner? (RLS BYPASS is usually on for owner/service_role)

-- Let's check if the trigger function owner has rights.
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Explicitly allow the function to bypass RLS (it should by default if owner is postgres/service_role, but good to be sure)
-- Postgres functions are separate from user roles.

-- One common issue: The `search_path` is set to `public`. 
-- If `extensions` schema is needed for `gen_random_uuid()`, it should be in path?
-- `gen_random_uuid()` is usually in `public` or `extensions`.
-- Let's update the function to be safer.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, extensions -- Add extensions just in case
AS $$
DECLARE
    new_company_id UUID;
    meta_company_name TEXT;
    meta_full_name TEXT;
BEGIN
    meta_company_name := NEW.raw_user_meta_data ->> 'company_name';
    meta_full_name := NEW.raw_user_meta_data ->> 'full_name';

    -- 1. Create a Profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, meta_full_name);

    -- 2. Logic for Company:
    IF meta_company_name IS NOT NULL THEN
        INSERT INTO public.companies (name)
        VALUES (meta_company_name)
        RETURNING id INTO new_company_id;
        
        -- Update Profile with new Company ID
        UPDATE public.profiles SET company_id = new_company_id WHERE user_id = NEW.id;

        -- Create Admin Team Member
        INSERT INTO public.team_members (company_id, user_id, full_name, email, role)
        VALUES (new_company_id, NEW.id, COALESCE(meta_full_name, 'Admin'), NEW.email, 'admin');

        -- Create Default Company Settings
        -- Ensure we don't violate any constraints. 
        -- company_settings has defaults for everything else.
        INSERT INTO public.company_settings (company_id, company_name, email)
        VALUES (new_company_id, meta_company_name, NEW.email);
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error to the Postgres log so we can debugging if we had access
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    -- Reraise so the transaction fails and user knows
    RAISE; 
END;
$$;
