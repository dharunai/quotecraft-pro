
-- Test the handle_new_user logic directly
DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    new_email TEXT := 'test.sql.' || extract(epoch from now())::text || '@example.com';
    payload JSONB := jsonb_build_object('full_name', 'SQL Tester', 'company_name', 'SQL Company');
    dummy_record RECORD;
BEGIN
    -- Simulate the auth.users insert which triggers the function
    -- We can't insert into auth.users easily due to permissions usually, but we can call the function manually if we mock the input.
    -- However, the function returns TRIGGER, so it expects to be called as a trigger.
    
    -- Alternatives:
    -- 1. Create a dummy table and a dummy trigger (cleanest)
    -- 2. Try to debug by inspecting the function code for obvious errors.

    -- Let's try to run the inner logic of the function directly to see if it raises an error.
    
    DECLARE
        new_company_id UUID;
        meta_company_name TEXT := payload ->> 'company_name';
        meta_full_name TEXT := payload ->> 'full_name';
    BEGIN
        RAISE NOTICE 'Testing logic for %', new_email;

        -- 1. Create Profile
        INSERT INTO public.profiles (user_id, email, full_name)
        VALUES (new_user_id, new_email, meta_full_name);
        
        RAISE NOTICE 'Profile created';

        -- 2. Logic for Company
        IF meta_company_name IS NOT NULL THEN
            INSERT INTO public.companies (name)
            VALUES (meta_company_name)
            RETURNING id INTO new_company_id;
            
            RAISE NOTICE 'Company created: %', new_company_id;
            
            -- Update Profile
            UPDATE public.profiles SET company_id = new_company_id WHERE user_id = new_user_id;

            RAISE NOTICE 'Profile updated';

            -- Create Admin Team Member
            INSERT INTO public.team_members (company_id, user_id, full_name, email, role)
            VALUES (new_company_id, new_user_id, COALESCE(meta_full_name, 'Admin'), new_email, 'admin');

            RAISE NOTICE 'Team member created';

            -- Create Default Company Settings
            INSERT INTO public.company_settings (company_id, company_name, email)
            VALUES (new_company_id, meta_company_name, new_email);
            
            RAISE NOTICE 'Settings created';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error during execution: % %', SQLERRM, SQLSTATE;
        RAISE; -- Re-raise to see it
    END;
    
    -- Rollback everything so we don't pollute DB
    RAISE EXCEPTION 'Test complete (rolled back)';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Caught exception: %', SQLERRM;
END $$;
