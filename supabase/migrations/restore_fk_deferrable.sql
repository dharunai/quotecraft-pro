
-- 1. Ensure no bad data exists
-- Clean up orphaned profiles (set company_id to null or delete)
UPDATE public.profiles SET company_id = NULL WHERE company_id IS NOT NULL AND company_id NOT IN (SELECT id FROM public.companies);

-- 2. Add Constraint back as DEFERRABLE
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_company_id_fkey 
  FOREIGN KEY (company_id) 
  REFERENCES public.companies(id)
  DEFERRABLE INITIALLY DEFERRED;
