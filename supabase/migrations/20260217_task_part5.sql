-- Part 5: Comments, Recurring Tasks, and Templates

-- 1. Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    mentions JSONB DEFAULT '[]', -- Array of user IDs or usernames mentioned
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.task_comments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.task_comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = user_id AND user_id = auth.uid()
    ));

-- 2. Update tasks table for Recurring features
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_pattern TEXT CHECK (recurring_pattern IN ('daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS recurring_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurring_end_date DATE,
ADD COLUMN IF NOT EXISTS recurring_end_count INTEGER,
ADD COLUMN IF NOT EXISTS recurring_next_date DATE,
ADD COLUMN IF NOT EXISTS recurring_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- 3. Refine task_templates table
-- Note: task_templates already exists from a previous migration, but we'll ensure it has the required fields
ALTER TABLE public.task_templates 
ADD COLUMN IF NOT EXISTS default_priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS default_due_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';

-- Ensure RLS is enabled and policies exist for task_templates (extending existing ones if needed)
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- If policies don't exist, create them
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_templates' AND policyname = 'Authenticated users can manage templates') THEN
        CREATE POLICY "Authenticated users can manage templates" ON public.task_templates
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Seed some default templates
-- 4. Seed some default templates
INSERT INTO public.task_templates (name, description, default_priority, default_due_days, checklist, template_tasks)
VALUES 
('Follow-up Lead', 'Routine follow-up for a new lead.', 'medium', 2, '[{"text": "Call lead", "completed": false}, {"text": "Send info pack", "completed": false}]', '[]'),
('Proposal Review', 'Review and finalize quotation before sending.', 'high', 1, '[{"text": "Check pricing", "completed": false}, {"text": "Verify entity details", "completed": false}]', '[]'),
('Client Meeting Prep', 'Preparation for upcoming project meeting.', 'urgent', 1, '[{"text": "Review previous notes", "completed": false}, {"text": "Prepare slides", "completed": false}]', '[]')
ON CONFLICT DO NOTHING;

-- 5. Recurring Task Generation Logic
CREATE OR REPLACE FUNCTION public.handle_recurring_tasks()
RETURNS VOID AS $$
DECLARE
    task_record RECORD;
    next_due_date DATE;
BEGIN
    FOR task_record IN 
        SELECT * FROM public.tasks 
        WHERE is_recurring = TRUE 
        AND (recurring_next_date IS NULL OR recurring_next_date <= CURRENT_DATE)
    LOOP
        -- Calculate next date based on the current next_date or due_date
        next_due_date := COALESCE(task_record.recurring_next_date, task_record.due_date, CURRENT_DATE);
        
        IF task_record.recurring_pattern = 'daily' THEN
            next_due_date := next_due_date + (task_record.recurring_interval * INTERVAL '1 day');
        ELSIF task_record.recurring_pattern = 'weekly' THEN
            next_due_date := next_due_date + (task_record.recurring_interval * INTERVAL '1 week');
        ELSIF task_record.recurring_pattern = 'monthly' THEN
            next_due_date := next_due_date + (task_record.recurring_interval * INTERVAL '1 month');
        END IF;

        -- Check if recurrence should continue
        IF (task_record.recurring_end_date IS NULL OR next_due_date <= task_record.recurring_end_date) THEN
            -- Create the new task instance
            INSERT INTO public.tasks (
                title, description, priority, status, assigned_to, 
                entity_type, entity_id, due_date, is_recurring,
                recurring_parent_id, created_at
            ) VALUES (
                task_record.title, task_record.description, task_record.priority, 'pending', task_record.assigned_to,
                task_record.entity_type, task_record.entity_id, COALESCE(task_record.recurring_next_date, task_record.due_date), FALSE,
                task_record.id, now()
            );

            -- Update the generator task with the next date
            UPDATE public.tasks SET recurring_next_date = next_due_date WHERE id = task_record.id;
        ELSE
            -- End recurrence
            UPDATE public.tasks SET is_recurring = FALSE WHERE id = task_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Note: In a real environment, you would schedule this with pg_cron:
-- SELECT cron.schedule('0 0 * * *', 'SELECT public.handle_recurring_tasks()');
