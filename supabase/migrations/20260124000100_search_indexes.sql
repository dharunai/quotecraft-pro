-- Indexes for text search performance
CREATE INDEX IF NOT EXISTS idx_leads_search ON public.leads USING gin(to_tsvector('english', company_name || ' ' || contact_name || ' ' || COALESCE(email, '')));
CREATE INDEX IF NOT EXISTS idx_quotations_search ON public.quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_invoices_search ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING gin(to_tsvector('english', name || ' ' || sku));
