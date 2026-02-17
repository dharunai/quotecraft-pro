-- Task History table for logging delegation/reassignment events
CREATE TABLE IF NOT EXISTS public.task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'delegated', 'reassigned', 'status_changed', 'created', etc.
    from_user_id UUID REFERENCES public.profiles(id),
    to_user_id UUID REFERENCES public.profiles(id),
    performed_by UUID REFERENCES public.profiles(id),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.task_history
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.task_history
    FOR INSERT TO authenticated WITH CHECK (true);
