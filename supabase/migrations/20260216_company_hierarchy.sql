-- Add hierarchy columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS department_id UUID,
ADD COLUMN IF NOT EXISTS reports_to UUID,
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 2, -- 0=Owner, 1=Manager, 2=Team Member
ADD COLUMN IF NOT EXISTS can_assign_tasks BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_view_all_tasks BOOLEAN DEFAULT FALSE;

-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, -- Assuming we might link this later if needed, but for now it's good practice
    name TEXT NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES public.profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add Foreign Key for department_id in profiles (after creating departments table)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_department_id_fkey') THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_department_id_fkey
        FOREIGN KEY (department_id) REFERENCES public.departments(id);
    END IF;
END $$;

-- Add Foreign Key for reports_to in profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_reports_to_fkey') THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_reports_to_fkey
        FOREIGN KEY (reports_to) REFERENCES public.profiles(id);
    END IF;
END $$;

-- Create task_assignments table
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES public.profiles(id),
    assigned_by UUID REFERENCES public.profiles(id),
    is_primary BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS delegated_from UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id),
ADD COLUMN IF NOT EXISTS watchers UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- RLS Policies for Departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.departments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.departments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.departments
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.departments
    FOR DELETE
    TO authenticated
    USING (true);

-- RLS Policies for Task Assignments
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.task_assignments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.task_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.task_assignments
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.task_assignments
    FOR DELETE
    TO authenticated
    USING (true);
