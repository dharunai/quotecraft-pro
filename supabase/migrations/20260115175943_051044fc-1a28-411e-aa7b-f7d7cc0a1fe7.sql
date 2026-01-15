-- Create app_role enum for future role-based access
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
EXECUTE FUNCTION public.update_updated_at_column();