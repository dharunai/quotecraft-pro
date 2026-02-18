
// supabase/functions/google-calendar/index.ts
// Manages Google Calendar events (create, list) and adds Google Meet links

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENV_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const ENV_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

async function getValidAccessToken(supabase: any, companyId: string, credentials: any): Promise<string> {
    if (credentials.expiry_date && Date.now() < credentials.expiry_date - 60000) {
        return credentials.access_token;
    }

    console.log('Refreshing access token...');

    // Fetch config from DB
    const { data: integration } = await supabase
        .from('integrations')
        .select('config')
        .eq('company_id', companyId)
        .eq('integration_type', 'google_workspace')
        .maybeSingle();

    const config = integration?.config as any || {};
    const clientId = config.client_id || ENV_CLIENT_ID;
    const clientSecret = config.client_secret || ENV_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Google Client ID/Secret not configured');
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: credentials.refresh_token,
            grant_type: 'refresh_token',
        }),
    });

    const data = await res.json();
    if (data.error) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

    // Update credentials in DB
    const newCredentials = {
        ...credentials,
        access_token: data.access_token,
        expiry_date: Date.now() + (data.expires_in * 1000),
    };

    await supabase.from('integrations').update({
        credentials: btoa(JSON.stringify(newCredentials)),
        updated_at: new Date().toISOString(),
    }).eq('company_id', companyId).eq('integration_type', 'google_workspace');

    return data.access_token;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const url = new URL(req.url); // Use request URL for query params
        const action = url.searchParams.get('action'); // Get action from query params (preferred) or body (fallback inside blocks)

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: teamMember } = await supabase.from('team_members').select('company_id').eq('user_id', user.id).single();
        if (!teamMember?.company_id) {
            return new Response(JSON.stringify({ error: 'No company found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const companyId = teamMember.company_id;
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        const { data: integration } = await supabaseAdmin
            .from('integrations')
            .select('credentials, is_enabled')
            .eq('company_id', companyId)
            .eq('integration_type', 'google_workspace')
            .single();

        if (!integration?.is_enabled || !integration.credentials) {
            return new Response(JSON.stringify({ error: 'Google Workspace not connected' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        let credentials;
        try {
            credentials = JSON.parse(atob(integration.credentials));
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const accessToken = await getValidAccessToken(supabaseAdmin, companyId, credentials);


        // ── Action: Create Event ──────────────────────────────────────────────────
        if (action === 'create') {
            const body = await req.json(); // Get body for create action
            const { summary, start, end, attendees, description, createMeet, leadId, dealId } = body;

            const event: any = {
                summary,
                description,
                start: { dateTime: start },
                end: { dateTime: end },
                attendees: attendees?.map((email: string) => ({ email })) || [],
            };

            if (createMeet) {
                event.conferenceData = {
                    createRequest: {
                        requestId: crypto.randomUUID(),
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                };
            }

            const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error.message);

            const meetLink = data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || null;

            // Save to DB
            await supabaseAdmin.from('google_calendar_events').insert({
                company_id: companyId,
                google_event_id: data.id,
                calendar_id: 'primary',
                summary: summary,
                description: description || null,
                start_time: start,
                end_time: end,
                attendees: attendees || [],
                meeting_link: meetLink,
                linked_lead_id: leadId || null,
                linked_deal_id: dealId || null,
                created_by: user.id,
            });

            // Log
            await supabaseAdmin.from('integration_logs').insert({
                company_id: companyId,
                integration_type: 'google_calendar',
                event_type: 'create_event',
                status: 'success',
                request_data: { summary, attendees },
                response_data: { event_id: data.id, meet_link: meetLink },
            });

            return new Response(JSON.stringify({
                success: true,
                eventId: data.id,
                meetLink,
                htmlLink: data.htmlLink,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ── Action: List Events ───────────────────────────────────────────────────
        if (action === 'list') { // GET request usually
            const timeMin = url.searchParams.get('timeMin') || new Date().toISOString();
            const timeMax = url.searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days

            const listRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            const listData = await listRes.json();

            if (listData.error) {
                return new Response(JSON.stringify({ error: listData.error.message }), {
                    status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({ events: listData.items || [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
