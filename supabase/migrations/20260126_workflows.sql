-- WORKFLOW AUTOMATION SYSTEM
-- Visual workflow builder with triggers, actions, conditions, and execution logging

-- 1. Workflow Definitions table
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Workflow structure
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'schedule', 'webhook', 'manual')),
    trigger_config JSONB NOT NULL DEFAULT '{}',
    flow_definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
    
    -- Execution settings
    is_active BOOLEAN NOT NULL DEFAULT false,
    error_handling TEXT NOT NULL DEFAULT 'stop' CHECK (error_handling IN ('stop', 'continue', 'retry')),
    max_retries INTEGER NOT NULL DEFAULT 3,
    retry_delay_seconds INTEGER NOT NULL DEFAULT 60,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    
    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Stats
    execution_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view workflows" ON public.workflow_definitions;
CREATE POLICY "Authenticated users can view workflows" ON public.workflow_definitions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage workflows" ON public.workflow_definitions;
CREATE POLICY "Authenticated users can manage workflows" ON public.workflow_definitions
FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_workflow_trigger ON public.workflow_definitions(trigger_type, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_active ON public.workflow_definitions(is_active) WHERE is_active = true;

-- 2. Workflow Executions table (detailed logging)
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE NOT NULL,
    
    -- Execution context
    trigger_event TEXT NOT NULL,
    trigger_data JSONB NOT NULL DEFAULT '{}',
    entity_type TEXT,
    entity_id UUID,
    
    -- Flow execution
    steps_executed JSONB NOT NULL DEFAULT '[]',
    current_step_id TEXT,
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'paused')),
    error_message TEXT,
    error_step_id TEXT,
    
    -- Performance
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Retry tracking
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Output
    output_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view executions" ON public.workflow_executions;
CREATE POLICY "Authenticated users can view executions" ON public.workflow_executions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage executions" ON public.workflow_executions;
CREATE POLICY "Authenticated users can manage executions" ON public.workflow_executions
FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_executions_workflow ON public.workflow_executions(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_status ON public.workflow_executions(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_executions_entity ON public.workflow_executions(entity_type, entity_id);

-- 3. Workflow Templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('sales', 'marketing', 'support', 'operations', 'inventory', 'payments')),
    icon TEXT,
    
    -- Template structure
    template_definition JSONB NOT NULL,
    
    -- Customization
    configurable_fields JSONB,
    required_integrations TEXT[],
    
    -- Metadata
    is_featured BOOLEAN NOT NULL DEFAULT false,
    use_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.workflow_templates;
CREATE POLICY "Authenticated users can view templates" ON public.workflow_templates
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage templates" ON public.workflow_templates;
CREATE POLICY "Authenticated users can manage templates" ON public.workflow_templates
FOR ALL TO authenticated USING (true);

-- 4. Insert default workflow templates
INSERT INTO public.workflow_templates (name, description, category, icon, is_featured, template_definition, configurable_fields) VALUES
(
    'Welcome New Lead',
    'Send a welcome email and create a follow-up task when a new lead is created',
    'sales',
    'UserPlus',
    true,
    '{
        "trigger": {"type": "event", "event": "lead.created"},
        "nodes": [
            {"id": "trigger_1", "type": "trigger", "position": {"x": 250, "y": 50}, "data": {"label": "Lead Created", "event": "lead.created"}},
            {"id": "email_1", "type": "email", "position": {"x": 250, "y": 150}, "data": {"label": "Send Welcome Email", "to": "{{lead.email}}", "subject": "Welcome to {{company.name}}!", "body": "Hi {{lead.contact_name}},\n\nThank you for your interest in our services."}},
            {"id": "task_1", "type": "task", "position": {"x": 250, "y": 250}, "data": {"label": "Create Follow-up Task", "title": "Follow up with {{lead.company_name}}", "due_offset_days": 1, "priority": "medium"}}
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "email_1"},
            {"id": "e2", "source": "email_1", "target": "task_1"}
        ]
    }',
    '{"email_subject": {"label": "Email Subject", "type": "text"}, "due_days": {"label": "Follow-up in days", "type": "number", "default": 1}}'
),
(
    'High-Value Lead Nurture',
    'Automatically nurture leads with deal value over threshold with personalized follow-ups',
    'sales',
    'TrendingUp',
    true,
    '{
        "trigger": {"type": "event", "event": "deal.created"},
        "nodes": [
            {"id": "trigger_1", "type": "trigger", "position": {"x": 250, "y": 50}, "data": {"label": "Deal Created", "event": "deal.created"}},
            {"id": "condition_1", "type": "condition", "position": {"x": 250, "y": 150}, "data": {"label": "Value > ₹1,00,000?", "field": "deal.deal_value", "operator": "greater_than", "value": 100000}},
            {"id": "notify_1", "type": "notification", "position": {"x": 100, "y": 250}, "data": {"label": "Notify Manager", "title": "High-Value Deal!", "message": "New deal worth ₹{{deal.deal_value}} from {{lead.company_name}}"}},
            {"id": "task_1", "type": "task", "position": {"x": 100, "y": 350}, "data": {"label": "Priority Task", "title": "Call {{lead.contact_name}} - High Value Lead", "priority": "urgent", "due_offset_days": 0}},
            {"id": "task_2", "type": "task", "position": {"x": 400, "y": 250}, "data": {"label": "Standard Task", "title": "Follow up with {{lead.company_name}}", "priority": "medium", "due_offset_days": 3}}
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "condition_1"},
            {"id": "e2", "source": "condition_1", "target": "notify_1", "sourceHandle": "true"},
            {"id": "e3", "source": "condition_1", "target": "task_2", "sourceHandle": "false"},
            {"id": "e4", "source": "notify_1", "target": "task_1"}
        ]
    }',
    '{"threshold": {"label": "Value Threshold (₹)", "type": "number", "default": 100000}}'
),
(
    'Quote Follow-up Sequence',
    'Automatically follow up on quotations that haven''t been accepted',
    'sales',
    'FileText',
    true,
    '{
        "trigger": {"type": "event", "event": "quotation.sent"},
        "nodes": [
            {"id": "trigger_1", "type": "trigger", "position": {"x": 250, "y": 50}, "data": {"label": "Quotation Sent", "event": "quotation.sent"}},
            {"id": "delay_1", "type": "delay", "position": {"x": 250, "y": 150}, "data": {"label": "Wait 3 Days", "delay_value": 3, "delay_unit": "days"}},
            {"id": "fetch_1", "type": "fetch_data", "position": {"x": 250, "y": 250}, "data": {"label": "Check Quote Status", "table": "quotations", "filters": [{"field": "id", "operator": "equals", "value": "{{quotation.id}}"}]}},
            {"id": "condition_1", "type": "condition", "position": {"x": 250, "y": 350}, "data": {"label": "Still Pending?", "field": "quotation.status", "operator": "equals", "value": "sent"}},
            {"id": "email_1", "type": "email", "position": {"x": 100, "y": 450}, "data": {"label": "Send Reminder", "to": "{{lead.email}}", "subject": "Following up on your quote", "body": "Hi {{lead.contact_name}},\n\nJust checking in on the quotation we sent. Let us know if you have any questions!"}},
            {"id": "task_1", "type": "task", "position": {"x": 100, "y": 550}, "data": {"label": "Create Task", "title": "Follow up on quote {{quotation.quote_number}}", "priority": "high", "due_offset_days": 1}}
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "delay_1"},
            {"id": "e2", "source": "delay_1", "target": "fetch_1"},
            {"id": "e3", "source": "fetch_1", "target": "condition_1"},
            {"id": "e4", "source": "condition_1", "target": "email_1", "sourceHandle": "true"}
        ]
    }',
    '{"wait_days": {"label": "Wait before follow-up (days)", "type": "number", "default": 3}}'
),
(
    'Deal Won Celebration',
    'Celebrate won deals with team notification and automatic invoice creation',
    'sales',
    'Trophy',
    true,
    '{
        "trigger": {"type": "event", "event": "deal.won"},
        "nodes": [
            {"id": "trigger_1", "type": "trigger", "position": {"x": 250, "y": 50}, "data": {"label": "Deal Won", "event": "deal.won"}},
            {"id": "notify_1", "type": "notification", "position": {"x": 250, "y": 150}, "data": {"label": "Notify Team", "title": "🎉 Deal Won!", "message": "{{lead.company_name}} - ₹{{deal.deal_value}}", "type": "success"}},
            {"id": "email_1", "type": "email", "position": {"x": 250, "y": 250}, "data": {"label": "Thank Customer", "to": "{{lead.email}}", "subject": "Thank you for choosing us!", "body": "Dear {{lead.contact_name}},\n\nThank you for your business! We are excited to work with {{lead.company_name}}."}},
            {"id": "task_1", "type": "task", "position": {"x": 250, "y": 350}, "data": {"label": "Kickoff Task", "title": "Schedule kickoff meeting with {{lead.company_name}}", "priority": "high", "due_offset_days": 2}}
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "notify_1"},
            {"id": "e2", "source": "notify_1", "target": "email_1"},
            {"id": "e3", "source": "email_1", "target": "task_1"}
        ]
    }',
    '{}'
),
(
    'Payment Reminder',
    'Send automated payment reminders for overdue invoices',
    'payments',
    'CreditCard',
    true,
    '{
        "trigger": {"type": "schedule", "schedule_type": "cron", "cron": "0 9 * * *"},
        "nodes": [
            {"id": "trigger_1", "type": "trigger", "position": {"x": 250, "y": 50}, "data": {"label": "Daily at 9 AM", "schedule_type": "cron", "cron": "0 9 * * *"}},
            {"id": "fetch_1", "type": "fetch_data", "position": {"x": 250, "y": 150}, "data": {"label": "Get Overdue Invoices", "table": "invoices", "filters": [{"field": "payment_status", "operator": "not_equals", "value": "paid"}, {"field": "due_date", "operator": "less_than", "value": "{{system.current_date}}"}]}},
            {"id": "loop_1", "type": "loop", "position": {"x": 250, "y": 250}, "data": {"label": "For Each Invoice", "array_source": "overdue_invoices", "item_variable": "invoice"}},
            {"id": "email_1", "type": "email", "position": {"x": 250, "y": 350}, "data": {"label": "Send Reminder", "to": "{{invoice.lead.email}}", "subject": "Payment Reminder - Invoice #{{invoice.invoice_number}}", "body": "Dear {{invoice.lead.contact_name}},\n\nThis is a reminder that invoice #{{invoice.invoice_number}} for ₹{{invoice.grand_total}} is overdue. Please arrange payment at your earliest convenience."}}
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "fetch_1"},
            {"id": "e2", "source": "fetch_1", "target": "loop_1"},
            {"id": "e3", "source": "loop_1", "target": "email_1"}
        ]
    }',
    '{"reminder_time": {"label": "Send reminders at", "type": "time", "default": "09:00"}}'
),
(
    'Low Stock Alert',
    'Get notified and create tasks when product stock is low',
    'inventory',
    'Package',
    false,
    '{
        "trigger": {"type": "event", "event": "product.stock_low"},
        "nodes": [
            {"id": "trigger_1", "type": "trigger", "position": {"x": 250, "y": 50}, "data": {"label": "Stock Low", "event": "product.stock_low"}},
            {"id": "notify_1", "type": "notification", "position": {"x": 250, "y": 150}, "data": {"label": "Alert Team", "title": "⚠️ Low Stock Alert", "message": "{{product.name}} ({{product.sku}}) is running low. Current stock: {{product.stock_quantity}}", "type": "warning"}},
            {"id": "condition_1", "type": "condition", "position": {"x": 250, "y": 250}, "data": {"label": "Out of Stock?", "field": "product.stock_quantity", "operator": "equals", "value": 0}},
            {"id": "task_1", "type": "task", "position": {"x": 100, "y": 350}, "data": {"label": "Urgent Reorder", "title": "URGENT: Reorder {{product.name}}", "priority": "urgent", "due_offset_days": 0}},
            {"id": "task_2", "type": "task", "position": {"x": 400, "y": 350}, "data": {"label": "Plan Reorder", "title": "Reorder {{product.name}} - Low Stock", "priority": "medium", "due_offset_days": 3}}
        ],
        "edges": [
            {"id": "e1", "source": "trigger_1", "target": "notify_1"},
            {"id": "e2", "source": "notify_1", "target": "condition_1"},
            {"id": "e3", "source": "condition_1", "target": "task_1", "sourceHandle": "true"},
            {"id": "e4", "source": "condition_1", "target": "task_2", "sourceHandle": "false"}
        ]
    }',
    '{}'
)
ON CONFLICT DO NOTHING;

-- 5. Function to update workflow stats
CREATE OR REPLACE FUNCTION public.update_workflow_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.workflow_definitions
        SET 
            execution_count = execution_count + 1,
            success_count = success_count + 1,
            last_executed_at = NEW.completed_at
        WHERE id = NEW.workflow_id;
    ELSIF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
        UPDATE public.workflow_definitions
        SET 
            execution_count = execution_count + 1,
            failure_count = failure_count + 1,
            last_executed_at = COALESCE(NEW.completed_at, now())
        WHERE id = NEW.workflow_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_workflow_stats_trigger ON public.workflow_executions;
CREATE TRIGGER update_workflow_stats_trigger
    AFTER INSERT OR UPDATE OF status ON public.workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_workflow_stats();

-- Done!
SELECT 'Workflow tables created successfully!' as status;
