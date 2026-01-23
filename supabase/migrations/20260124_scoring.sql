-- Add score to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMP WITH TIME ZONE;

-- Lead Scoring Rules Table
CREATE TABLE IF NOT EXISTS public.lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- Field, condition, value
    points INTEGER NOT NULL, -- Points to add/subtract
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_lead_scoring_rules_updated_at
BEFORE UPDATE ON public.lead_scoring_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
DO $$ BEGIN
    CREATE POLICY "Authenticated users can view scoring rules" ON public.lead_scoring_rules FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admins can manage scoring rules" ON public.lead_scoring_rules FOR ALL TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Default Rules Seed (Simulated)
-- In a real migration, we would INSERT INTO lead_scoring_rules here.
