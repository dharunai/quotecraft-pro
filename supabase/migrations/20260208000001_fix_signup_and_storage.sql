-- Fix Signup, Storage, and Cleanup Data

-- 1. Create company-assets bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to company-assets
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'company-assets' );

CREATE POLICY "Auth Users Can Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'company-assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Users Can Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'company-assets' AND auth.role() = 'authenticated' );

-- 2. Update handle_new_user to create company and link
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_company_id UUID;
  company_name_input TEXT;
BEGIN
  -- Get company name from metadata or default
  company_name_input := COALESCE(new.raw_user_meta_data->>'company_name', 'My Company');

  -- Create a new Company Settings record (The Tenant)
  INSERT INTO public.company_settings (company_name, email, currency)
  VALUES (company_name_input, new.email, '₹')
  RETURNING id INTO new_company_id;

  -- Create the Team Member linked to that company as ADMIN
  INSERT INTO public.team_members (user_id, full_name, email, role, company_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    'admin', -- First user of the company is always admin
    new_company_id
  );
  
  -- Create a Profile linked to the company
  INSERT INTO public.profiles (user_id, full_name, email, company_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    new_company_id
  );

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- If something fails, still try to create the user but maybe log error?
    -- For now, we want it to fail so the user knows something is wrong
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Cleanup Old Data (As requested: "delete the old datas")
-- CAREFUL: This wipes business data to ensure clean slate for new schema
TRUNCATE TABLE public.leads CASCADE;
TRUNCATE TABLE public.deals CASCADE;
TRUNCATE TABLE public.quotations CASCADE;
TRUNCATE TABLE public.invoices CASCADE;
TRUNCATE TABLE public.tasks CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.meetings CASCADE;
TRUNCATE TABLE public.team_members CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
-- Note: we don't truncate auth.users because we can't easily from here, 
-- but effectively the "app" data is reset.
