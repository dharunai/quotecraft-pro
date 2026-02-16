-- Create workflow_definitions table
CREATE TABLE public.workflow_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  flow_definition JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores the visual flow structure (nodes, edges)
  trigger_config JSONB DEFAULT '{}'::jsonb, -- Metadata about trigger (type, event, etc.) for quick lookup
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow definitions" ON public.workflow_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage workflow definitions" ON public.workflow_definitions
  FOR ALL TO authenticated USING (true);

-- Create workflow_executions table
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  trigger_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  entity_type TEXT,
  entity_id UUID,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'paused')),
  steps_executed JSONB DEFAULT '[]'::jsonb,
  current_step_id TEXT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow executions" ON public.workflow_executions
  FOR SELECT TO authenticated USING (true);

-- Create workflow_nodes table (Optional, for querying/analytics if needed later)
-- We strictly use flow_definition in workflow_definitions as source of truth for execution
CREATE TABLE public.workflow_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE NOT NULL,
  node_id TEXT NOT NULL, -- The ID used in the flow_definition JSON
  node_type TEXT NOT NULL,
  node_config JSONB DEFAULT '{}'::jsonb,
  position_x INTEGER,
  position_y INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow nodes" ON public.workflow_nodes
  FOR SELECT TO authenticated USING (true);

-- Trigger to update updated_at for workflow_definitions
CREATE TRIGGER update_workflow_definitions_updated_at
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
