-- ============================================================
-- INTEGRATIONS MODULE - PHASE 1: DATABASE FOUNDATION
-- Fixed: 2026-02-18
-- NOTE: This project uses company_settings as the "companies" table.
--       Roles live on team_members (not profiles).
--       get_user_company_id() helper already exists.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. INTEGRATIONS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_settings(id) ON DELETE CASCADE NOT NULL,
    integration_type TEXT NOT NULL CHECK (integration_type IN (
        'google_workspace', 'gmail', 'google_calendar', 'google_meet', 'google_drive',
        'whatsapp', 'telegram', 'ai_assistant'
    )),
    is_enabled BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}',
    credentials TEXT DEFAULT NULL,  -- stored as AES-encrypted string
    connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    connected_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, integration_type)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- All authenticated users in the same company can view integrations
CREATE POLICY "Users view company integrations"
    ON public.integrations FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

-- Only admins can create/update/delete integrations
CREATE POLICY "Admins manage integrations"
    ON public.integrations FOR ALL
    TO authenticated
    USING (
        company_id = public.get_user_company_id()
        AND EXISTS (
            SELECT 1 FROM public.team_members
            WHERE user_id = auth.uid()
              AND role IN ('admin')
              AND is_active = true
        )
    );

CREATE INDEX IF NOT EXISTS idx_integrations_company ON public.integrations(company_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON public.integrations(company_id, is_enabled);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS integrations_updated_at ON public.integrations;
CREATE TRIGGER integrations_updated_at
    BEFORE UPDATE ON public.integrations
    FOR EACH ROW EXECUTE FUNCTION public.update_integrations_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. INTEGRATION LOGS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_settings(id) ON DELETE CASCADE NOT NULL,
    integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
    integration_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    request_data JSONB,
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company logs"
    ON public.integration_logs FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_integration_logs_company ON public.integration_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_entity ON public.integration_logs(entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────
-- 3. GMAIL MESSAGES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gmail_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_settings(id) ON DELETE CASCADE NOT NULL,
    gmail_message_id TEXT NOT NULL,
    gmail_thread_id TEXT NOT NULL,
    from_email TEXT NOT NULL,
    to_email TEXT[],
    cc_email TEXT[],
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    labels TEXT[],
    is_read BOOLEAN DEFAULT false,
    linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    linked_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, gmail_message_id)
);

ALTER TABLE public.gmail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company emails"
    ON public.gmail_messages FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_gmail_messages_company ON public.gmail_messages(company_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_thread ON public.gmail_messages(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_lead ON public.gmail_messages(linked_lead_id);

-- ─────────────────────────────────────────────────────────────
-- 4. WHATSAPP MESSAGES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_settings(id) ON DELETE CASCADE NOT NULL,
    wa_message_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    contact_name TEXT,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
    message_text TEXT,
    media_url TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, wa_message_id)
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company whatsapp"
    ON public.whatsapp_messages FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON public.whatsapp_messages(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON public.whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead ON public.whatsapp_messages(linked_lead_id);

-- ─────────────────────────────────────────────────────────────
-- 5. TELEGRAM MESSAGES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.telegram_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_settings(id) ON DELETE CASCADE NOT NULL,
    telegram_message_id TEXT NOT NULL,
    telegram_chat_id TEXT NOT NULL,
    telegram_user_id TEXT,
    username TEXT,
    first_name TEXT,
    message_text TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company telegram"
    ON public.telegram_messages FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_telegram_messages_company ON public.telegram_messages(company_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat ON public.telegram_messages(telegram_chat_id);

-- ─────────────────────────────────────────────────────────────
-- 6. AI CONVERSATIONS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_settings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    conversation_context TEXT,
    entity_type TEXT,
    entity_id UUID,
    messages JSONB NOT NULL DEFAULT '[]',
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY "Users view own conversations"
    ON public.ai_conversations FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_user_company_id()
        AND user_id = auth.uid()
    );

CREATE POLICY "Users manage own conversations"
    ON public.ai_conversations FOR ALL
    TO authenticated
    USING (
        company_id = public.get_user_company_id()
        AND user_id = auth.uid()
    );

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, created_at DESC);

DROP TRIGGER IF EXISTS ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER ai_conversations_updated_at
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_integrations_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 7. GOOGLE CALENDAR EVENTS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.google_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_settings(id) ON DELETE CASCADE NOT NULL,
    google_event_id TEXT NOT NULL,
    calendar_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    attendees JSONB,
    meeting_link TEXT,
    linked_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    linked_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, google_event_id)
);

ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company events"
    ON public.google_calendar_events FOR SELECT
    TO authenticated
    USING (company_id = public.get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_calendar_events_company ON public.google_calendar_events(company_id, start_time);
