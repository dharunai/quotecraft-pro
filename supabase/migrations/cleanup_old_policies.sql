-- Cleanup old permissive policies that conflict with tenant isolation

-- Products
DROP POLICY IF EXISTS "view_products" ON public.products;
DROP POLICY IF EXISTS "create_products" ON public.products;
DROP POLICY IF EXISTS "update_products" ON public.products;
DROP POLICY IF EXISTS "delete_products" ON public.products;

-- Product Categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.product_categories;
DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.product_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.product_categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.product_categories;
