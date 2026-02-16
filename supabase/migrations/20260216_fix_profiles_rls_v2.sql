-- Drop the flawed policy
DROP POLICY IF EXISTS "Admins and Owners can update company profiles" ON public.profiles;

-- Create the corrected policy using user_id instead of id
CREATE POLICY "Admins and Owners can update company profiles" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner', 'manager')
    )
    OR
    (SELECT can_assign_tasks FROM public.profiles WHERE user_id = auth.uid()) IS TRUE
  )
);
