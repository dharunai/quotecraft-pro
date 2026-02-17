-- Fix Foreign Key in task_comments
-- The previous definition referenced profiles(id), but we are passing auth.users.id (which matches profiles.user_id)
-- We need to change the FK to reference profiles(user_id) instead.

-- 1. Drop the old constraint
ALTER TABLE public.task_comments
DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;

-- 2. Add the new constraint referencing user_id
-- Note: This assumes profiles.user_id is UNIQUE. If it's not explicitly unique in the DB, we might need to add a unique constraint first.
-- Usually user_id in profiles is unique.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

ALTER TABLE public.task_comments
ADD CONSTRAINT task_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;
