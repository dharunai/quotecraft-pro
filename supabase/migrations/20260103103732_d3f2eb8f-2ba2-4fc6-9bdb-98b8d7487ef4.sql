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
  FOR DELETE TO authenticated USING (bucket_id = 'company-assets');