-- Create debug logs table
CREATE TABLE IF NOT EXISTS public.debug_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT ALL ON public.debug_logs TO postgres, service_role, anon, authenticated;

-- Update trigger to log progress
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
    INSERT INTO public.debug_logs (message, details) VALUES ('Trigger Started', to_jsonb(NEW));

    meta_company_name := NEW.raw_user_meta_data ->> 'company_name';
    meta_full_name := NEW.raw_user_meta_data ->> 'full_name';

    INSERT INTO public.debug_logs (message, details) VALUES ('Parsed Metadata', jsonb_build_object('company', meta_company_name, 'name', meta_full_name));

    -- 1. Create a Profile
    BEGIN
        INSERT INTO public.profiles (user_id, email, full_name)
        VALUES (NEW.id, NEW.email, meta_full_name);
        INSERT INTO public.debug_logs (message) VALUES ('Profile Created');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.debug_logs (message, details) VALUES ('Profile Creation Failed', to_jsonb(SQLERRM));
        RAISE; 
    END;

    -- 2. Logic for Company:
    IF meta_company_name IS NOT NULL THEN
        BEGIN
            INSERT INTO public.companies (name)
            VALUES (meta_company_name)
            RETURNING id INTO new_company_id;
            INSERT INTO public.debug_logs (message, details) VALUES ('Company Created', to_jsonb(new_company_id));
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.debug_logs (message, details) VALUES ('Company Creation Failed', to_jsonb(SQLERRM));
            RAISE;
        END;
        
        -- Update Profile with new Company ID
        UPDATE public.profiles SET company_id = new_company_id WHERE user_id = NEW.id;

        -- Create Admin Team Member
        BEGIN
            INSERT INTO public.team_members (company_id, user_id, full_name, email, role)
            VALUES (new_company_id, NEW.id, COALESCE(meta_full_name, 'Admin'), NEW.email, 'admin');
             INSERT INTO public.debug_logs (message) VALUES ('Team Member Created');
        EXCEPTION WHEN OTHERS THEN
             INSERT INTO public.debug_logs (message, details) VALUES ('Team Member Creation Failed', to_jsonb(SQLERRM));
             RAISE;
        END;

        -- Create Default Company Settings
        BEGIN
            INSERT INTO public.company_settings (company_id, company_name, email)
            VALUES (new_company_id, meta_company_name, NEW.email);
            INSERT INTO public.debug_logs (message) VALUES ('Settings Created');
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO public.debug_logs (message, details) VALUES ('Settings Creation Failed', to_jsonb(SQLERRM));
            RAISE;
        END;
    ELSE
        INSERT INTO public.debug_logs (message) VALUES ('No Company Name Provided - Skipping Company Creation');
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.debug_logs (message, details) VALUES ('Critical Trigger Error', to_jsonb(SQLERRM));
    RAISE; 
END;
$$;
