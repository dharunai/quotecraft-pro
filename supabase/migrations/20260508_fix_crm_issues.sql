-- Fix 1: Add assigned_to column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Fix 2: Improve generate_quote_number RPC to avoid duplicates
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    new_quote_number TEXT;
    year_prefix TEXT;
    current_count INT;
    counter INT := 0;
BEGIN
    year_prefix := 'QT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-';
    
    LOOP
        -- Get the next count based on existing records for the current year
        SELECT COUNT(*) INTO current_count 
        FROM public.quotations 
        WHERE quote_number LIKE year_prefix || '%';
        
        new_quote_number := year_prefix || LPAD((current_count + 1 + counter)::TEXT, 4, '0');
        
        -- Check if this number already exists (just in case of gaps or manual entries)
        IF NOT EXISTS (SELECT 1 FROM public.quotations WHERE quote_number = new_quote_number) THEN
            RETURN new_quote_number;
        END IF;
        
        counter := counter + 1;
        
        -- Safety break
        IF counter > 1000 THEN
            RETURN new_quote_number || '-' || floor(random() * 10000)::text;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Fix 3: Ensure customer_requirement exists (already done but good to have in one place)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_requirement TEXT;
