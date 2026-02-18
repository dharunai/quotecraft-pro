
-- DEBUG: TEMPORARILY DISABLE RLS ON INTEGRATIONS
-- This confirms if the "Failed to fetch" is due to permission blocking the config read.

ALTER TABLE public.integrations DISABLE ROW LEVEL SECURITY;
