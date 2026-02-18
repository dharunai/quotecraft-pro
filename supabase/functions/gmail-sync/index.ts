// supabase/functions/gmail-sync/index.ts
// Syncs Gmail messages for a company and auto-links to leads

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

// Refresh an expired access token
async function refreshAccessToken(refreshToken: string): Promise<string> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
        }),
    });
    const data = await res.json();
    if (data.error) throw new Error(`Token refresh failed: ${data.error}`);
    return data.access_token;
}

// Get a valid access token (refresh if expired)
async function getValidAccessToken(credentials: any): Promise<string> {
    const isExpired = credentials.expiry_date && Date.now() >= credentials.expiry_date - 60000;
    if (isExpired && credentials.refresh_token) {
        return await refreshAccessToken(credentials.refresh_token);
    }
    return credentials.access_token;
}

// Extract plain text/html from Gmail message payload
function extractBody(payload: any): { text: string; html: string } {
    let text = '';
    let html = '';

    const decode = (data: string) => {
        try {
            return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch { return ''; }
    };

    if (payload?.body?.data) {
        text = decode(payload.body.data);
    }

    if (payload?.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                text = decode(part.body.data);
            }
            if (part.mimeType === 'text/html' && part.body?.data) {
                html = decode(part.body.data);
            }
            // Handle nested multipart
            if (part.parts) {
                for (const subPart of part.parts) {
                    if (subPart.mimeType === 'text/plain' && subPart.body?.data) {
                        text = decode(subPart.body.data);
                    }
                    if (subPart.mimeType === 'text/html' && subPart.body?.data) {
                        html = decode(subPart.body.data);
                    }
                }
            }
        }
    }

    return { text, html };
}

// Extract email address from "Name <email>" format
function extractEmail(raw: string): string {
    const match = raw.match(/<([^>]+)>/);
    return match ? match[1].trim() : raw.trim();
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
    );

    Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

// Get all enabled Google Workspace integrations
const { data: integrations, error } = await supabase
    .from('integrations')
    .select('company_id, credentials, config')
    .eq('integration_type', 'google_workspace')
    .eq('is_enabled', true);

if (error) throw error;

const results = [];

for (const integration of integrations || []) {
    const companyId = integration.company_id;

    try {
        let credentials;
        try {
            credentials = JSON.parse(atob(integration.credentials));
        } catch (e) {
            console.error(`Invalid credentials for company ${companyId}`);
            continue;
        }

        const accessToken = await getValidAccessToken(supabase, companyId, credentials);

        // Fetch unread messages
        const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:unread', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const listData = await listRes.json();

        if (!listData.messages || listData.messages.length === 0) {
            results.push({ companyId, synced: 0 });
            continue;
        }

        let syncedCount = 0;

        for (const msgStub of listData.messages) {
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgStub.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const msg = await msgRes.json();

            // Extract headers
            const headers = msg.payload.headers;
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
            const from = headers.find((h: any) => h.name === 'From')?.value || '';
            const date = headers.find((h: any) => h.name === 'Date')?.value;

            // Extract sender email
            const fromEmailMatch = from.match(/<(.+)>/);
            const fromEmail = fromEmailMatch ? fromEmailMatch[1] : from;

            // Check if message already exists
            const { data: existing } = await supabase
                .from('gmail_messages')
                .select('id')
                .eq('gmail_id', msg.id)
                .single();

            if (existing) continue;

            // Decode body
            let body = '';
            if (msg.payload.parts) {
                const part = msg.payload.parts.find((p: any) => p.mimeType === 'text/html') || msg.payload.parts.find((p: any) => p.mimeType === 'text/plain');
                if (part && part.body.data) {
                    body = new TextDecoder().decode(Uint8Array.from(atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
                }
            } else if (msg.payload.body.data) {
                body = new TextDecoder().decode(Uint8Array.from(atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
            }

            // Auto-link to lead
            const { data: lead } = await supabase
                .from('leads')
                .select('id')
                .eq('company_id', companyId)
                .eq('email', fromEmail)
                .single();

            // Save to DB
            await supabase.from('gmail_messages').insert({
                company_id: companyId,
                gmail_id: msg.id,
                thread_id: msg.threadId,
                sender: from,
                recipient: 'me', // It's strictly inbox sync for now
                subject,
                snippet: msg.snippet,
                body_html: body,
                received_at: new Date(date).toISOString(),
                lead_id: lead?.id || null,
                is_read: false,
            });

            // Mark as read in Gmail (optional - maybe keep unread? Let's keep unread for now or user preference)
            // For now, we just sync. User can mark read in UI later.

            syncedCount++;
        }

        // Update last sync time
        await supabase.from('integrations')
            .update({ last_sync_at: new Date().toISOString(), sync_status: 'success' })
            .eq('company_id', companyId)
            .eq('integration_type', 'google_workspace');

        results.push({ companyId, synced: syncedCount });

    } catch (err: any) {
        console.error(`Sync error for company ${companyId}:`, err);
        await supabase.from('integrations')
            .update({ sync_status: 'error', error_message: err.message })
            .eq('company_id', companyId)
            .eq('integration_type', 'google_workspace');
    }
}

return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}
});
