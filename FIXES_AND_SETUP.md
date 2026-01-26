# QuoteCraft Pro - Complete Setup & Fixes

## ISSUE 1: Product Creation Not Working

**Root Cause:** Missing `products` table columns or RLS policies

**QUICK FIX - Run this SQL in Supabase:**

```sql
-- Make sure products table has all required columns
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sku TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Verify RLS is enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

-- Create fresh policies
CREATE POLICY "view_products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "create_products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_products" ON public.products FOR DELETE TO authenticated USING (true);
```

---

## ISSUE 2: Missing Company Settings Columns

**Already provided - Run this SQL:**

```sql
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV',
ADD COLUMN IF NOT EXISTS default_due_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS invoice_terms TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS email_signature TEXT,
ADD COLUMN IF NOT EXISTS quotation_email_subject TEXT,
ADD COLUMN IF NOT EXISTS quotation_email_body TEXT,
ADD COLUMN IF NOT EXISTS invoice_email_subject TEXT,
ADD COLUMN IF NOT EXISTS invoice_email_body TEXT,
ADD COLUMN IF NOT EXISTS enable_stock_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS stock_alert_email TEXT,
ADD COLUMN IF NOT EXISTS alert_on_low_stock BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS alert_on_out_of_stock BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_logo_on_pdf BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS include_hsn_sac BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pdf_footer_text TEXT;
```

---

## ISSUE 3: Automations & Tasks Not Working

**Run these SQL migrations:**

### A. Fix Automation Rules (if table missing)
```sql
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL,
    trigger_conditions JSONB,
    actions JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    execution_count INTEGER NOT NULL DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "view_automation_rules" ON public.automation_rules;
DROP POLICY IF EXISTS "manage_automation_rules" ON public.automation_rules;

CREATE POLICY "view_automation_rules" ON public.automation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage_automation_rules" ON public.automation_rules FOR ALL TO authenticated USING (true);
```

### B. Fix Automation Logs
```sql
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

DROP POLICY IF EXISTS "view_automation_logs" ON public.automation_logs;

CREATE POLICY "view_automation_logs" ON public.automation_logs FOR SELECT TO authenticated USING (true);
```

### C. Fix Tasks
```sql
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT,
    entity_id UUID,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date DATE,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view_tasks" ON public.tasks;
DROP POLICY IF EXISTS "manage_tasks" ON public.tasks;

CREATE POLICY "view_tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage_tasks" ON public.tasks FOR ALL TO authenticated USING (true);

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### D. Fix Task Templates
```sql
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_tasks JSONB NOT NULL,
    entity_type TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view_task_templates" ON public.task_templates;

CREATE POLICY "view_task_templates" ON public.task_templates FOR SELECT TO authenticated USING (true);
```

---

## COMPLETE EXECUTION ORDER

1. **Product Fix** - Copy/paste the product SQL above
2. **Company Settings** - Copy/paste the company settings SQL above
3. **Automation Rules** - Copy/paste section A
4. **Automation Logs** - Copy/paste section B
5. **Tasks** - Copy/paste section C
6. **Task Templates** - Copy/paste section D
7. **Refresh your browser** - Hard refresh (Cmd+Shift+R on Mac)
8. **Test Product Creation** - Try adding a product now

---

## STEPS TO RUN

1. Go to: https://supabase.com/dashboard/project/anqdcadmweehttbmmdey
2. Click **SQL Editor**
3. **For EACH section above:**
   - Click **New Query**
   - Copy the SQL
   - Paste it
   - Click **Run**
4. After all are done, **Refresh your app** (Cmd+Shift+R)
5. **Try creating a product again**

If still not working, share the exact error message from the browser console!
