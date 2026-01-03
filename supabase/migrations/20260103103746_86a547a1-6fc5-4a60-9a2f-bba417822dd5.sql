-- Fix function search path for generate_quote_number
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
$$;