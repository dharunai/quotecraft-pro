-- Add created_by column to tasks table for "Created by Me" filter
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
