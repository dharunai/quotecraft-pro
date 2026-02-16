
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, extensions
AS $$
BEGIN
    -- Minimal trigger: Just return NEW.
    -- This verifies if the auth.users insert itself is working.
    RETURN NEW;
END;
$$;
