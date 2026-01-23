-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    category TEXT, -- 'deal', 'task', 'payment', 'stock', 'system'
    entity_type TEXT,
    entity_id UUID,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    email_digest BOOLEAN NOT NULL DEFAULT true,
    email_digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_digest_frequency IN ('daily', 'weekly', 'never')),
    notify_deal_created BOOLEAN NOT NULL DEFAULT true,
    notify_deal_won BOOLEAN NOT NULL DEFAULT true,
    notify_quote_accepted BOOLEAN NOT NULL DEFAULT true,
    notify_invoice_paid BOOLEAN NOT NULL DEFAULT true,
    notify_task_assigned BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Policies
DO $$ BEGIN
    CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
