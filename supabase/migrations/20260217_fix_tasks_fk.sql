
-- Fix tasks assigned_to foreign key to ensure it points to profiles
ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
ON DELETE SET NULL;
