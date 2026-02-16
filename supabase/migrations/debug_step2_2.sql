
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

    -- 1. Create a Profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, meta_full_name);

    -- 2. Logic for Company:
    IF meta_company_name IS NOT NULL THEN
        INSERT INTO public.companies (name)
        VALUES (meta_company_name)
        RETURNING id INTO new_company_id;
        
        -- Update Profile with new Company ID (RESTORED)
        UPDATE public.profiles SET company_id = new_company_id WHERE user_id = NEW.id;

        -- Create Admin Team Member (SKIPPED)
        -- INSERT INTO public.team_members (company_id, user_id, full_name, email, role)
        -- VALUES (new_company_id, NEW.id, COALESCE(meta_full_name, 'Admin'), NEW.email, 'admin');
    END IF;

    RETURN NEW;
END;
$$;
