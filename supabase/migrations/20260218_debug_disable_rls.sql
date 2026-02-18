
-- DEBUG: TEMPORARILY DISABLE RLS ON TEAM_MEMBERS
-- This will confirm if the error is due to permissions or something else.
-- Please run this in the Supabase SQL Editor.

ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
