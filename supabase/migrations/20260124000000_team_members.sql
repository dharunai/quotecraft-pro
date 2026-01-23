-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'sales', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND role = 'admin'
      AND is_active = true
  )
$$;

-- Trigger to update updated_at
CREATE OR REPLACE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies for team_members
CREATE POLICY "Authenticated users can view team members" ON public.team_members
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage team members" ON public.team_members
FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Insert current user as admin (auto-fix for first user)
-- This is a best-effort attempt to make the first user an admin if the table is empty
INSERT INTO public.team_members (user_id, full_name, email, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Admin'), email, 'admin'
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.team_members)
ORDER BY created_at ASC
LIMIT 1;
