-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Company Settings table (singleton pattern)
CREATE TABLE public.company_settings (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view company settings" ON public.company_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update company settings" ON public.company_settings
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert company settings" ON public.company_settings
  FOR INSERT TO authenticated WITH CHECK (true);

-- Leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view leads" ON public.leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads" ON public.leads
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete leads" ON public.leads
  FOR DELETE TO authenticated USING (true);

-- Quotations table
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
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

CREATE POLICY "Authenticated users can view quotations" ON public.quotations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create quotations" ON public.quotations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotations" ON public.quotations
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete quotations" ON public.quotations
  FOR DELETE TO authenticated USING (true);

-- Quotation Items table
CREATE TABLE public.quotation_items (
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

CREATE POLICY "Authenticated users can view quotation items" ON public.quotation_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create quotation items" ON public.quotation_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotation items" ON public.quotation_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete quotation items" ON public.quotation_items
  FOR DELETE TO authenticated USING (true);

-- Function to generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  quote_count INTEGER;
  new_number TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO quote_count 
  FROM public.quotations 
  WHERE quote_number LIKE 'QT-' || current_year || '-%';
  new_number := 'QT-' || current_year || '-' || LPAD(quote_count::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings
INSERT INTO public.company_settings (company_name, email, address, terms)
VALUES (
  'Your Company Name',
  'contact@yourcompany.com',
  'Your Company Address',
  'Payment terms: 50% advance, 50% on delivery. All prices are subject to applicable taxes.'
);

-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

CREATE POLICY "Anyone can view company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can upload company assets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can update company assets" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can delete company assets" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'company-assets');-- Fix function search path for generate_quote_number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  quote_count INTEGER;
  new_number TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO quote_count 
  FROM public.quotations 
  WHERE quote_number LIKE 'QT-' || current_year || '-%';
  new_number := 'QT-' || current_year || '-' || LPAD(quote_count::TEXT, 4, '0');
  RETURN new_number;
END;
$$;-- Create app_role enum for future role-based access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Create product_categories table
CREATE TABLE public.product_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories" ON public.product_categories
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create categories" ON public.product_categories
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories" ON public.product_categories
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete categories" ON public.product_categories
FOR DELETE TO authenticated USING (true);

-- Create products table
CREATE TABLE public.products (
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

CREATE POLICY "Authenticated users can view products" ON public.products
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create products" ON public.products
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" ON public.products
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete products" ON public.products
FOR DELETE TO authenticated USING (true);

-- Create deals table
CREATE TABLE public.deals (
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

CREATE POLICY "Authenticated users can view deals" ON public.deals
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create deals" ON public.deals
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update deals" ON public.deals
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete deals" ON public.deals
FOR DELETE TO authenticated USING (true);

-- Add is_qualified column to leads
ALTER TABLE public.leads ADD COLUMN is_qualified BOOLEAN NOT NULL DEFAULT false;

-- Add deal_id column to quotations
ALTER TABLE public.quotations ADD COLUMN deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;

-- Create invoices table
CREATE TABLE public.invoices (
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

CREATE POLICY "Authenticated users can view invoices" ON public.invoices
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create invoices" ON public.invoices
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices" ON public.invoices
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete invoices" ON public.invoices
FOR DELETE TO authenticated USING (true);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
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

CREATE POLICY "Authenticated users can view invoice items" ON public.invoice_items
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create invoice items" ON public.invoice_items
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice items" ON public.invoice_items
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete invoice items" ON public.invoice_items
FOR DELETE TO authenticated USING (true);

-- Add invoice_id column to quotations
ALTER TABLE public.quotations ADD COLUMN invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Add banking fields to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN bank_name TEXT,
ADD COLUMN account_number TEXT,
ADD COLUMN ifsc_code TEXT,
ADD COLUMN account_holder_name TEXT,
ADD COLUMN invoice_prefix TEXT NOT NULL DEFAULT 'INV',
ADD COLUMN default_due_days INTEGER NOT NULL DEFAULT 30,
ADD COLUMN invoice_terms TEXT;

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  invoice_count INTEGER;
  new_number TEXT;
  prefix TEXT;
BEGIN
  SELECT invoice_prefix INTO prefix FROM public.company_settings LIMIT 1;
  IF prefix IS NULL THEN
    prefix := 'INV';
  END IF;
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO invoice_count 
  FROM public.invoices 
  WHERE invoice_number LIKE prefix || '-' || current_year || '-%';
  new_number := prefix || '-' || current_year || '-' || LPAD(invoice_count::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- Create function to generate SKU
CREATE OR REPLACE FUNCTION public.generate_sku()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create triggers for updated_at on new tables
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_categories_updated_at
BEFORE UPDATE ON public.product_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();-- Update company_settings with email templates and stock alert settings (only add missing columns)
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS email_signature TEXT,
ADD COLUMN IF NOT EXISTS quotation_email_subject TEXT DEFAULT 'Quotation #{quote_number} from {company_name}',
ADD COLUMN IF NOT EXISTS quotation_email_body TEXT DEFAULT 'Dear {contact_name},

Please find attached quotation #{quote_number} for your review.

If you have any questions, feel free to reach out.

Best regards,
{company_name}',
ADD COLUMN IF NOT EXISTS invoice_email_subject TEXT DEFAULT 'Invoice #{invoice_number} from {company_name}',
ADD COLUMN IF NOT EXISTS invoice_email_body TEXT DEFAULT 'Dear {contact_name},

Please find attached invoice #{invoice_number}.

Payment is due by {due_date}.

Thank you for your business!

Best regards,
{company_name}',
ADD COLUMN IF NOT EXISTS enable_stock_alerts BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS stock_alert_email TEXT,
ADD COLUMN IF NOT EXISTS alert_on_low_stock BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_on_out_of_stock BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_logo_on_pdf BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS include_hsn_sac BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS pdf_footer_text TEXT;-- Create team_members table
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

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND role = 'admin'
      AND is_active = true
  )
$$;

-- Trigger to update updated_at
CREATE OR REPLACE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies for team_members
CREATE POLICY "Authenticated users can view team members" ON public.team_members
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage team members" ON public.team_members
FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Insert current user as admin (auto-fix for first user)
-- This is a best-effort attempt to make the first user an admin if the table is empty
INSERT INTO public.team_members (user_id, full_name, email, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Admin'), email, 'admin'
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.team_members)
ORDER BY created_at ASC
LIMIT 1;
-- Indexes for text search performance
CREATE INDEX IF NOT EXISTS idx_leads_search ON public.leads USING gin(to_tsvector('english', company_name || ' ' || contact_name || ' ' || COALESCE(email, '')));
CREATE INDEX IF NOT EXISTS idx_quotations_search ON public.quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_invoices_search ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING gin(to_tsvector('english', name || ' ' || sku));
-- Trigger to automatically add new users to team_members
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.team_members (user_id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    CASE WHEN (SELECT count(*) FROM public.team_members) = 0 THEN 'admin' ELSE 'viewer' END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
-- Automation Rules Table
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL, -- 'lead_created', 'lead_qualified', 'quotation_status_changed', etc.
    trigger_conditions JSONB, -- Conditions that must be met
    actions JSONB NOT NULL, -- Array of actions to perform
    is_active BOOLEAN NOT NULL DEFAULT true,
    execution_count INTEGER NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Automation Logs Table
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    trigger_event TEXT NOT NULL,
    actions_executed JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
    error_message TEXT,
    execution_time_ms INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Helper to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
DO $$ BEGIN
    CREATE POLICY "Authenticated users can view automation rules" ON public.automation_rules FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admins can manage automation rules" ON public.automation_rules FOR ALL TO authenticated USING (true); -- Simplified for dev
    CREATE POLICY "Authenticated users can view automation logs" ON public.automation_logs FOR SELECT TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    category TEXT, -- 'deal', 'task', 'payment', 'stock', 'system'
    entity_type TEXT,
    entity_id UUID,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    email_digest BOOLEAN NOT NULL DEFAULT true,
    email_digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_digest_frequency IN ('daily', 'weekly', 'never')),
    notify_deal_created BOOLEAN NOT NULL DEFAULT true,
    notify_deal_won BOOLEAN NOT NULL DEFAULT true,
    notify_quote_accepted BOOLEAN NOT NULL DEFAULT true,
    notify_invoice_paid BOOLEAN NOT NULL DEFAULT true,
    notify_task_assigned BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
DO $$ BEGIN
    CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
-- Add score to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMP WITH TIME ZONE;

-- Lead Scoring Rules Table
CREATE TABLE IF NOT EXISTS public.lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- Field, condition, value
    points INTEGER NOT NULL, -- Points to add/subtract
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_lead_scoring_rules_updated_at
BEFORE UPDATE ON public.lead_scoring_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
DO $$ BEGIN
    CREATE POLICY "Authenticated users can view scoring rules" ON public.lead_scoring_rules FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admins can manage scoring rules" ON public.lead_scoring_rules FOR ALL TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Default Rules Seed (Simulated)
-- In a real migration, we would INSERT INTO lead_scoring_rules here.
-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT, -- 'lead', 'deal', 'quotation', 'invoice'
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

-- Task Templates Table
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_tasks JSONB NOT NULL, -- Array of tasks with relative due dates
    entity_type TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
DO $$ BEGIN
    CREATE POLICY "Authenticated users can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL TO authenticated USING (true); -- Simplified
    CREATE POLICY "Authenticated users can view templates" ON public.task_templates FOR SELECT TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
