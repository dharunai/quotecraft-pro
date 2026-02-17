-- Add avatar_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update RLS policies if necessary (usually existing policies cover update/select for owner)
-- Ensure authenticated users can see avatars
-- (Existing policies likely cover this as profiles are usually public/readable by auth users)
