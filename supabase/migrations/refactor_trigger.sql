
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
        -- Fallback: Just create profile without company
        INSERT INTO public.profiles (user_id, email, full_name)
        VALUES (NEW.id, NEW.email, meta_full_name);
    END IF;

    RETURN NEW;
END;
$$;
