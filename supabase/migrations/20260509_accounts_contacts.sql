-- MIGRATION: Accounts and Contacts Modules
-- Following Zoho CRM logic: Accounts (Companies) and Contacts (People)

-- 1. Create Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    phone TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    description TEXT,
    annual_revenue NUMERIC,
    employees_count INTEGER,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    job_title TEXT,
    department TEXT,
    description TEXT,
    mailing_address TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.5 Ensure columns exist if tables were already created
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 3. Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
DROP POLICY IF EXISTS "view_accounts" ON public.accounts;
CREATE POLICY "view_accounts" ON public.accounts FOR SELECT TO authenticated USING (company_id = public.get_current_company_id());
DROP POLICY IF EXISTS "manage_accounts" ON public.accounts;
CREATE POLICY "manage_accounts" ON public.accounts FOR ALL TO authenticated USING (company_id = public.get_current_company_id());

DROP POLICY IF EXISTS "view_contacts" ON public.contacts;
CREATE POLICY "view_contacts" ON public.contacts FOR SELECT TO authenticated USING (company_id = public.get_current_company_id());
DROP POLICY IF EXISTS "manage_contacts" ON public.contacts;
CREATE POLICY "manage_contacts" ON public.contacts FOR ALL TO authenticated USING (company_id = public.get_current_company_id());

-- 5. Add update triggers
DROP TRIGGER IF EXISTS update_accounts_updated_at ON public.accounts;
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Update other tables to link to Accounts/Contacts
-- Deals
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Quotations
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- 7. Add comments for documentation
COMMENT ON TABLE public.accounts IS 'Organizations or companies that the CRM user does business with.';
COMMENT ON TABLE public.contacts IS 'People associated with accounts or individual customers.';
