-- Create interaction_logs table for manual follow-up notes and call logs
CREATE TABLE IF NOT EXISTS public.interaction_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL DEFAULT 'call' CHECK (interaction_type IN ('call', 'meeting', 'email', 'note', 'other')),
  notes TEXT NOT NULL,
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interaction_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming multi-tenancy pattern used in other tables)
CREATE POLICY "Users can view interaction logs for their company" ON public.interaction_logs
  FOR SELECT TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert interaction logs for their company" ON public.interaction_logs
  FOR INSERT TO authenticated WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update interaction logs for their company" ON public.interaction_logs
  FOR UPDATE TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete interaction logs for their company" ON public.interaction_logs
  FOR DELETE TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_interaction_logs_updated_at
  BEFORE UPDATE ON public.interaction_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
