-- Automation Rules Table
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL, -- 'lead_created', 'lead_qualified', 'quotation_status_changed', etc.
    trigger_conditions JSONB, -- Conditions that must be met
    actions JSONB NOT NULL, -- Array of actions to perform
    is_active BOOLEAN NOT NULL DEFAULT true,
    execution_count INTEGER NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Automation Logs Table
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    trigger_event TEXT NOT NULL,
    actions_executed JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
    error_message TEXT,
    execution_time_ms INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Helper to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
DO $$ BEGIN
    CREATE POLICY "Authenticated users can view automation rules" ON public.automation_rules FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admins can manage automation rules" ON public.automation_rules FOR ALL TO authenticated USING (true); -- Simplified for dev
    CREATE POLICY "Authenticated users can view automation logs" ON public.automation_logs FOR SELECT TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
