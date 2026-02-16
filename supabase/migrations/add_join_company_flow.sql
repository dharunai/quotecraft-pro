-- 1. Add company_code to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS company_code TEXT UNIQUE;

-- 2. Function to generate a simple random company code (e.g., TEAM-8392)
CREATE OR REPLACE FUNCTION public.generate_company_code()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'tm-' || substring(md5(random()::text) from 1 for 6);
$$;

-- 3. Update existing companies with a code if missing
UPDATE public.companies 
SET company_code = public.generate_company_code() 
WHERE company_code IS NULL;

-- 4. Make company_code NOT NULL after backfilling
ALTER TABLE public.companies 
ALTER COLUMN company_code SET NOT NULL;

-- 5. Helper function to find company by code (Secure RPC)
CREATE OR REPLACE FUNCTION public.get_company_by_code(code_input TEXT)
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT c.id, c.name FROM public.companies c WHERE c.company_code = code_input LIMIT 1;
END;
$$;

-- 6. Update handle_new_user trigger to support Joining
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    new_company_id UUID;
    meta_company_name TEXT;
    meta_full_name TEXT;
    meta_mode TEXT;
    meta_company_code TEXT;
    existing_company_record RECORD;
BEGIN
    meta_company_name := NEW.raw_user_meta_data ->> 'company_name';
    meta_full_name := NEW.raw_user_meta_data ->> 'full_name';
    meta_mode := NEW.raw_user_meta_data ->> 'mode'; -- 'create' or 'join'
    meta_company_code := NEW.raw_user_meta_data ->> 'company_code';

    -- 1. Create a Profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, meta_full_name);

    -- 2. Logic based on Mode
    IF meta_mode = 'join' AND meta_company_code IS NOT NULL THEN
        -- JOIN EXISTING COMPANY
        SELECT id, name INTO existing_company_record FROM public.companies WHERE company_code = meta_company_code;

        IF existing_company_record.id IS NOT NULL THEN
            -- Link Profile to Company
            UPDATE public.profiles SET company_id = existing_company_record.id WHERE user_id = NEW.id;

            -- Add as 'viewer' (default for joiners, admin can upgrade)
            INSERT INTO public.team_members (company_id, user_id, full_name, email, role)
            VALUES (existing_company_record.id, NEW.id, COALESCE(meta_full_name, 'Member'), NEW.email, 'viewer');
        ELSE
            -- Compnay not found: User remains orphan (profile created, no company)
            -- Frontend should handle this check before signup if possible, but this is safety.
            RAISE NOTICE 'Company code % not found for user %', meta_company_code, NEW.email;
        END IF;

    ELSE
        -- CREATE NEW COMPANY (Default)
        -- Only if company name is provided
        IF meta_company_name IS NOT NULL THEN
            INSERT INTO public.companies (name, company_code)
            VALUES (meta_company_name, public.generate_company_code())
            RETURNING id INTO new_company_id;
            
            -- Update Profile with new Company ID
            UPDATE public.profiles SET company_id = new_company_id WHERE user_id = NEW.id;

            -- Create Admin Team Member
            INSERT INTO public.team_members (company_id, user_id, full_name, email, role)
            VALUES (new_company_id, NEW.id, COALESCE(meta_full_name, 'Admin'), NEW.email, 'admin');

            -- Create Default Company Settings
            INSERT INTO public.company_settings (company_id, company_name, email)
            VALUES (new_company_id, meta_company_name, NEW.email);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
