-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view email templates for their company" ON public.email_templates
  FOR SELECT TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert email templates for their company" ON public.email_templates
  FOR INSERT TO authenticated WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Seed with 10 default templates (using NULL company_id for global defaults if needed, 
-- but here we'll assume we can't easily do global defaults without more complex logic, 
-- so we'll just seed them for the current company or as examples)
-- Actually, let's just create a function to seed for a company if it's empty.

-- For now, I'll just create the table. I'll handle the "10 defaults" in code if DB is empty.
