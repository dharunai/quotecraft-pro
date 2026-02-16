CREATE OR REPLACE FUNCTION public.get_rls_json(table_names text[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(p))
    INTO result
    FROM pg_policies p
    WHERE p.tablename = ANY(table_names);
    
    RETURN result;
END;
$$;
