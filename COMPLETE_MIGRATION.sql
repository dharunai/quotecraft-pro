-- COMPLETE DATABASE MIGRATION FOR QUOTECRAFT PRO
-- Run this ENTIRE script in Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/anqdcadmweehttbmmdey/sql/new

-- 1. Create update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Company Settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Your Company',
  logo_url TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  gst_number TEXT,
  pan TEXT,
  currency TEXT NOT NULL DEFAULT '₹',
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  terms TEXT,
  theme_color TEXT NOT NULL DEFAULT '#166534',
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  account_holder_name TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  default_due_days INTEGER NOT NULL DEFAULT 30,
  invoice_terms TEXT,
  email_signature TEXT,
  quotation_email_subject TEXT,
  quotation_email_body TEXT,
  invoice_email_subject TEXT,
  invoice_email_body TEXT,
  enable_stock_alerts BOOLEAN NOT NULL DEFAULT true,
  stock_alert_email TEXT,
  alert_on_low_stock BOOLEAN NOT NULL DEFAULT true,
  alert_on_out_of_stock BOOLEAN NOT NULL DEFAULT true,
  show_logo_on_pdf BOOLEAN NOT NULL DEFAULT true,
  include_hsn_sac BOOLEAN NOT NULL DEFAULT true,
  pdf_footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view company settings" ON public.company_settings;
CREATE POLICY "Authenticated users can view company settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can update company settings" ON public.company_settings;
CREATE POLICY "Authenticated users can update company settings" ON public.company_settings FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert company settings" ON public.company_settings;
CREATE POLICY "Authenticated users can insert company settings" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default company settings if not exists
INSERT INTO public.company_settings (company_name, email)
SELECT 'Your Company Name', 'contact@yourcompany.com'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- 4. Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  notes TEXT,
  is_qualified BOOLEAN NOT NULL DEFAULT false,
  score INTEGER NOT NULL DEFAULT 0,
  score_updated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
CREATE POLICY "Authenticated users can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create leads" ON public.leads;
CREATE POLICY "Authenticated users can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
CREATE POLICY "Authenticated users can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);

-- 5. Product Categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.product_categories;
CREATE POLICY "Authenticated users can view categories" ON public.product_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.product_categories;
CREATE POLICY "Authenticated users can create categories" ON public.product_categories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.product_categories;
CREATE POLICY "Authenticated users can update categories" ON public.product_categories FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.product_categories;
CREATE POLICY "Authenticated users can delete categories" ON public.product_categories FOR DELETE TO authenticated USING (true);

-- 6. Products table
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC,
    unit TEXT NOT NULL DEFAULT 'pcs',
    tax_rate NUMERIC,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by uuid,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
CREATE POLICY "Authenticated users can create products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
CREATE POLICY "Authenticated users can update products" ON public.products FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
CREATE POLICY "Authenticated users can delete products" ON public.products FOR DELETE TO authenticated USING (true);

-- 7. Deals table
CREATE TABLE IF NOT EXISTS public.deals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL UNIQUE,
    deal_value NUMERIC,
    stage TEXT NOT NULL DEFAULT 'qualified',
    probability INTEGER NOT NULL DEFAULT 25,
    expected_close_date DATE,
    won_date DATE,
    lost_date DATE,
    lost_reason TEXT,
    notes TEXT,
    created_by uuid,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view deals" ON public.deals;
CREATE POLICY "Authenticated users can view deals" ON public.deals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create deals" ON public.deals;
CREATE POLICY "Authenticated users can create deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update deals" ON public.deals;
CREATE POLICY "Authenticated users can update deals" ON public.deals FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can delete deals" ON public.deals;
CREATE POLICY "Authenticated users can delete deals" ON public.deals FOR DELETE TO authenticated USING (true);

-- 8. Quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  invoice_id uuid,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;
CREATE POLICY "Authenticated users can view quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create quotations" ON public.quotations;
CREATE POLICY "Authenticated users can create quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update quotations" ON public.quotations;
CREATE POLICY "Authenticated users can update quotations" ON public.quotations FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can delete quotations" ON public.quotations;
CREATE POLICY "Authenticated users can delete quotations" ON public.quotations FOR DELETE TO authenticated USING (true);

-- 9. Quotation Items table
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view quotation items" ON public.quotation_items;
CREATE POLICY "Authenticated users can view quotation items" ON public.quotation_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create quotation items" ON public.quotation_items;
CREATE POLICY "Authenticated users can create quotation items" ON public.quotation_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update quotation items" ON public.quotation_items;
CREATE POLICY "Authenticated users can update quotation items" ON public.quotation_items FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can delete quotation items" ON public.quotation_items;
CREATE POLICY "Authenticated users can delete quotation items" ON public.quotation_items FOR DELETE TO authenticated USING (true);

-- 10. Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
    quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_enabled BOOLEAN NOT NULL DEFAULT true,
    tax_rate NUMERIC NOT NULL DEFAULT 18,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    grand_total NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    payment_notes TEXT,
    terms_conditions TEXT,
    notes TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_by uuid,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
CREATE POLICY "Authenticated users can view invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create invoices" ON public.invoices;
CREATE POLICY "Authenticated users can create invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
CREATE POLICY "Authenticated users can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON public.invoices;
CREATE POLICY "Authenticated users can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (true);

-- Add foreign key constraint for quotations.invoice_id if not exists
DO $$ BEGIN
    ALTER TABLE public.quotations ADD CONSTRAINT quotations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 11. Invoice Items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    item_title TEXT NOT NULL,
    description TEXT,
    hsn_sac_code TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view invoice items" ON public.invoice_items;
CREATE POLICY "Authenticated users can view invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create invoice items" ON public.invoice_items;
CREATE POLICY "Authenticated users can create invoice items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update invoice items" ON public.invoice_items;
CREATE POLICY "Authenticated users can update invoice items" ON public.invoice_items FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can delete invoice items" ON public.invoice_items;
CREATE POLICY "Authenticated users can delete invoice items" ON public.invoice_items FOR DELETE TO authenticated USING (true);

-- 12. Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT,
    entity_id UUID,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date DATE,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
CREATE POLICY "Authenticated users can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can manage tasks" ON public.tasks;
CREATE POLICY "Users can manage tasks" ON public.tasks FOR ALL TO authenticated USING (true);

-- 13. Team Members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'sales', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.team_members;
CREATE POLICY "Authenticated users can view team members" ON public.team_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage team members" ON public.team_members;
CREATE POLICY "Authenticated users can manage team members" ON public.team_members FOR ALL TO authenticated USING (true);

-- 14. Automation Rules table
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL,
    trigger_conditions JSONB,
    actions JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    execution_count INTEGER NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view automation rules" ON public.automation_rules;
CREATE POLICY "Authenticated users can view automation rules" ON public.automation_rules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage automation rules" ON public.automation_rules;
CREATE POLICY "Authenticated users can manage automation rules" ON public.automation_rules FOR ALL TO authenticated USING (true);

-- 15. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    category TEXT,
    entity_type TEXT,
    entity_id UUID,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 16. Email Logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_type TEXT NOT NULL,
    entity_id UUID,
    recipient TEXT NOT NULL,
    cc TEXT[],
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    resend_id TEXT,
    error_message TEXT,
    sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view email logs" ON public.email_logs;
CREATE POLICY "Authenticated users can view email logs" ON public.email_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create email logs" ON public.email_logs;
CREATE POLICY "Authenticated users can create email logs" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update email logs" ON public.email_logs;
CREATE POLICY "Authenticated users can update email logs" ON public.email_logs FOR UPDATE TO authenticated USING (true);

-- 17. Helper Functions
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  quote_count INTEGER;
  new_number TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO quote_count FROM public.quotations WHERE quote_number LIKE 'QT-' || current_year || '-%';
  new_number := 'QT-' || current_year || '-' || LPAD(quote_count::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  invoice_count INTEGER;
  new_number TEXT;
  prefix TEXT;
BEGIN
  SELECT invoice_prefix INTO prefix FROM public.company_settings LIMIT 1;
  IF prefix IS NULL THEN prefix := 'INV'; END IF;
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO invoice_count FROM public.invoices WHERE invoice_number LIKE prefix || '-' || current_year || '-%';
  new_number := prefix || '-' || current_year || '-' || LPAD(invoice_count::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_sku()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  product_count INTEGER;
  new_sku TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO product_count FROM public.products;
  new_sku := 'PROD-' || LPAD(product_count::TEXT, 4, '0');
  RETURN new_sku;
END;
$$;

-- 18. Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Done!
SELECT 'Migration completed successfully!' as status;
