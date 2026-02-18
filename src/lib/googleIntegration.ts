// src/lib/googleIntegration.ts
// Frontend service layer for Google Workspace integration.
// Uses Supabase Functions Framework for robust calls.

import { supabase } from '@/integrations/supabase/client';

// Helper to handle function invocation results
async function invoke<T = any>(
    functionName: string,
    options: {
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
        body?: any;
    } = {}
): Promise<T> {
    const { data, error } = await supabase.functions.invoke(functionName, {
        method: options.method || 'POST', // Default to POST as per framework recommendation
        body: options.body,
    });

    if (error) {
        console.error(`Error invoking ${functionName}:`, error);
        // If it's a context error (e.g. Failed to send), wrap it
        throw new Error(error.message || 'Failed to connect to service');
    }

    return data;
}

// ─────────────────────────────────────────────────────────────
// OAUTH
// ─────────────────────────────────────────────────────────────

/**
 * Get the Google OAuth authorization URL and redirect the user to it.
 */
export async function connectGoogleWorkspace(): Promise<void> {
    // We pass query params in the function name for GET requests or actions handled via URL
    const data = await invoke('google-oauth?action=generate-url', {
        method: 'GET', // Keep using GET as the function expects it in query params
    });

    if (!data.url) throw new Error('No redirection URL returned');

    // Redirect browser to Google's consent screen
    window.location.href = data.url;
}

/**
 * Disconnect Google Workspace for the current company.
 */
export async function disconnectGoogleWorkspace(): Promise<void> {
    await invoke('google-oauth?action=disconnect', {
        method: 'POST',
    });
}

/**
 * Save Google Workspace configuration (Client ID & Secret) for the company.
 */
export async function saveGoogleConfig(clientId: string, clientSecret: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // @ts-ignore: type definition missing for team_members
    const { data: teamMember, error: tmError } = await supabase
        .from('team_members')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (tmError || !teamMember?.company_id) {
        throw new Error('No company found for this user.');
    }

    // Fetch existing config to merge
    // @ts-ignore: type definition missing for integrations
    const { data: existing } = await supabase
        .from('integrations')
        .select('config')
        .eq('company_id', teamMember.company_id)
        .eq('integration_type', 'google_workspace')
        .maybeSingle();

    const newConfig = {
        ...(existing?.config as object || {}),
        client_id: clientId,
        client_secret: clientSecret,
    };

    // @ts-ignore: type definition missing for integrations
    const { error } = await supabase
        .from('integrations')
        .upsert({
            company_id: teamMember.company_id,
            integration_type: 'google_workspace',
            config: newConfig,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,integration_type' });

    if (error) throw error;
}

/**
 * Get the current Google Workspace integration status and config for the company.
 */
export async function getGoogleIntegrationStatus(): Promise<{
    connected: boolean;
    googleEmail?: string;
    googleName?: string;
    clientId?: string;
    lastSyncAt?: string;
    syncStatus?: string;
}> {
    // This reads directly from DB (no Edge Function needed for status check)
    // @ts-ignore: type definition missing for integrations
    const { data, error } = await supabase
        .from('integrations')
        .select('is_enabled, config, last_sync_at, sync_status')
        .eq('integration_type', 'google_workspace')
        .maybeSingle();

    if (error || !data) return { connected: false };

    const config = data.config as any;

    return {
        connected: data.is_enabled || false,
        googleEmail: config?.google_email,
        googleName: config?.google_name,
        clientId: config?.client_id,
        lastSyncAt: data.last_sync_at,
        syncStatus: data.sync_status,
    };
}

// ─────────────────────────────────────────────────────────────
// GMAIL
// ─────────────────────────────────────────────────────────────

/**
 * Trigger a Gmail sync for the current company.
 */
export async function syncGmail(): Promise<{ synced: number }> {
    const data = await invoke('gmail-sync', { method: 'POST' });
    // Aggregating results if array is returned, or just taking first
    if (Array.isArray(data.results)) {
        return { synced: data.results.reduce((acc: number, r: any) => acc + (r.synced || 0), 0) };
    }
    return { synced: 0 };
}

/**
 * Send an email via the company's connected Gmail account.
 */
export async function sendGmailEmail(params: {
    to: string;
    subject: string;
    body: string;
    cc?: string[];
    replyTo?: string;
}): Promise<{ messageId: string }> {
    return invoke('gmail-send', {
        method: 'POST',
        body: params
    });
}

/**
 * Fetch synced Gmail messages from the local DB (no API call).
 */
export async function getGmailMessages(options: {
    leadId?: string;
    limit?: number;
} = {}) {
    // @ts-ignore: type definition missing for gmail_messages
    let query = supabase
        .from('gmail_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(options.limit || 50);

    if (options.leadId) {
        query = query.eq('linked_lead_id', options.leadId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// ─────────────────────────────────────────────────────────────
// GOOGLE CALENDAR & MEET
// ─────────────────────────────────────────────────────────────

/**
 * Create a Google Calendar event with an optional Google Meet link.
 */
export async function createCalendarEvent(params: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    attendees: string[];
    timezone?: string;
    leadId?: string;
    dealId?: string;
    createMeet?: boolean;
}): Promise<{ eventId: string; meetLink: string | null; htmlLink: string }> {
    // Note: We need to pass action via query param or body. 
    // The google-calendar function checks body 'action' OR URL param 'action' in some logic.
    // To be safe, let's use URL param since that's how we wrote the robust Edge Function logic?
    // Wait, google-calendar usually expects BODY for create.
    // Let's check google-calendar code:
    // "const url = new URL(req.url); const action = url.searchParams.get('action');" 
    // So action MUST be in URL.

    return invoke('google-calendar?action=create', {
        method: 'POST',
        body: params,
    });
}

/**
 * List upcoming Google Calendar events.
 */
export async function listCalendarEvents(options: {
    timeMin?: string;
    timeMax?: string;
} = {}): Promise<any[]> {
    const params = new URLSearchParams({ action: 'list' });
    if (options.timeMin) params.set('timeMin', options.timeMin);
    if (options.timeMax) params.set('timeMax', options.timeMax);

    const data = await invoke(`google-calendar?${params.toString()}`, {
        method: 'GET', // List is usually GET
    });
    return data.events || [];
}

/**
 * Fetch synced calendar events from the local DB.
 */
export async function getLocalCalendarEvents(options: {
    leadId?: string;
    dealId?: string;
    limit?: number;
} = {}) {
    // @ts-ignore: type definition missing for google_calendar_events
    let query = supabase
        .from('google_calendar_events')
        .select('*')
        .order('start_time', { ascending: true })
        .limit(options.limit || 50);

    if (options.leadId) query = query.eq('linked_lead_id', options.leadId);
    if (options.dealId) query = query.eq('linked_deal_id', options.dealId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}
