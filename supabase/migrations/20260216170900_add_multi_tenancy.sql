-- Multi-tenancy Migration

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'trial')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Add company_id to profiles and link to companies
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 3. Migration: Create a default company for existing users if any
DO $$ 
DECLARE 
    default_company_id UUID;
    config_company_name TEXT;
BEGIN
    -- Check if we have users but no companies
    IF EXISTS (SELECT 1 FROM auth.users) AND NOT EXISTS (SELECT 1 FROM public.companies) THEN
        -- Try to get name from settings, fallback to 'Default Company'
        SELECT company_name INTO config_company_name FROM public.company_settings LIMIT 1;
        IF config_company_name IS NULL THEN 
            config_company_name := 'Default Company';
        END IF;

        INSERT INTO public.companies (name) VALUES (config_company_name) RETURNING id INTO default_company_id;
        
        -- Assign all existing profiles to this company
        UPDATE public.profiles SET company_id = default_company_id WHERE company_id IS NULL;
    END IF;
END $$;

-- 4. Add company_id to all other tables
DO $$ 
DECLARE 
    tbl TEXT;
    default_company_id UUID;
BEGIN
    SELECT id INTO default_company_id FROM public.companies LIMIT 1;
    
    -- List of tables to add company_id to
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('company_settings', 'leads', 'quotations', 'products', 'product_categories', 'deals', 'invoices', 'invoice_items', 'quotation_items', 'tasks', 'task_templates', 'team_members', 'automation_rules', 'automation_logs', 'notifications', 'lead_scoring_rules')
    LOOP
        -- 1. Add column if it doesn't exist
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id UUID', tbl);

        -- 2. Drop existing constraint if any
        BEGIN
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', tbl, tbl || '_company_id_fkey');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- 2.5 Sanitize data: Ensure all company_ids are valid
        IF default_company_id IS NOT NULL THEN
            -- Update NULLs
            EXECUTE format('UPDATE public.%I SET company_id = %L WHERE company_id IS NULL', tbl, default_company_id);
            
            -- Update IDs that don't exist in companies table
            EXECUTE format('UPDATE public.%I SET company_id = %L WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM public.companies)', tbl, default_company_id);
        END IF;

        -- 3. Add correct constraint
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (company_id) REFERENCES public.companies(id)', tbl, tbl || '_company_id_fkey');
        
        -- Backfill existing data
        IF default_company_id IS NOT NULL THEN
            EXECUTE format('UPDATE public.%I SET company_id = %L WHERE company_id IS NULL', tbl, default_company_id);
        END IF;
    END LOOP;
END $$;

-- 5. RLS Policies

-- Helper function to get current user's company_id
CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Policy for companies table
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company" ON public.companies
FOR SELECT TO authenticated
USING (id = public.get_current_company_id());

DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;
CREATE POLICY "Users can update their own company" ON public.companies
FOR UPDATE TO authenticated
USING (id = public.get_current_company_id());

-- Update Profiles RLS - Allow viewing profiles in same company
DROP POLICY IF EXISTS "Users can view profiles in same company" ON public.profiles;
CREATE POLICY "Users can view profiles in same company" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id OR 
  company_id = public.get_current_company_id()
);

-- General RLS Update Function (for simple tables)
CREATE OR REPLACE PROCEDURE public.apply_tenant_isolation_policy(table_name TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Drop existing wide policies if they exist (best effort based on common naming)
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %I" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can create %I" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %I" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete %I" ON public.%I', table_name, table_name);

    -- Create new tenant-isolated policies
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Select %I" ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY "Tenant Isolation Select %I" ON public.%I FOR SELECT TO authenticated USING (company_id = public.get_current_company_id())', table_name, table_name);

    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Insert %I" ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY "Tenant Isolation Insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id = public.get_current_company_id())', table_name, table_name);

    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Update %I" ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY "Tenant Isolation Update %I" ON public.%I FOR UPDATE TO authenticated USING (company_id = public.get_current_company_id())', table_name, table_name);

    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Delete %I" ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY "Tenant Isolation Delete %I" ON public.%I FOR DELETE TO authenticated USING (company_id = public.get_current_company_id())', table_name, table_name);
END;
$$;

-- Apply RLS to business tables
CALL public.apply_tenant_isolation_policy('leads');
CALL public.apply_tenant_isolation_policy('deals');
CALL public.apply_tenant_isolation_policy('quotations');
CALL public.apply_tenant_isolation_policy('invoices');
CALL public.apply_tenant_isolation_policy('products');
CALL public.apply_tenant_isolation_policy('product_categories');
CALL public.apply_tenant_isolation_policy('tasks');
CALL public.apply_tenant_isolation_policy('company_settings');
CALL public.apply_tenant_isolation_policy('team_members');
CALL public.apply_tenant_isolation_policy('automation_rules');
CALL public.apply_tenant_isolation_policy('automation_logs');

-- 6. Handling New User Sign Up (Trigger Update)
-- We need to replace the old trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_company_id UUID;
    meta_company_name TEXT;
    meta_full_name TEXT;
BEGIN
    meta_company_name := NEW.raw_user_meta_data ->> 'company_name';
    meta_full_name := NEW.raw_user_meta_data ->> 'full_name';

    -- 1. Create a Profile (temporarily without company_id)
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, meta_full_name);

    -- 2. Logic for Company:
    -- If user metadata has 'company_name', creating a NEW company
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
        INSERT INTO public.company_settings (company_id, company_name, email)
        VALUES (new_company_id, meta_company_name, NEW.email);
    
    -- ELSE: User might be invited. check if invited logic handles this? 
    -- For now, if no company name, they are orphan until assigned.
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure the trigger is set (it might already exist, just refreshing it)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
