
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
    meta_full_name TEXT;
BEGIN
    meta_full_name := NEW.raw_user_meta_data ->> 'full_name';

    -- 1. Create a Profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, meta_full_name);

    RETURN NEW;
END;
$$;
