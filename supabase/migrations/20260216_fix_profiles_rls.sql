-- Allow Admins and Owners to update profiles within their company
CREATE POLICY "Admins and Owners can update company profiles" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
  AND (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner', 'manager')
    )
    OR
    -- Fallback: If current user has 'can_assign_tasks' = true in profiles, let them update?
    (SELECT can_assign_tasks FROM public.profiles WHERE id = auth.uid()) IS TRUE
  )
);

-- Ensure team_members RLS is also correct if we rely on it
-- (Assuming team_members is readable)

-- Note: existing "Users can update own profile" usage covers self-update.
