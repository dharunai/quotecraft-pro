CREATE OR REPLACE FUNCTION public.inspect_policies()
RETURNS TABLE (
    p_schemaname name,
    p_tablename name,
    p_policyname name,
    p_permissive text,
    p_roles name[],
    p_cmd text,
    p_qual text,
    p_with_check text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive, 
        roles, 
        cmd, 
        qual::text, 
        with_check::text
    FROM pg_policies
    WHERE tablename IN ('products', 'product_categories');
END;
$$;
