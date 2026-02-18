
// supabase/functions/gmail-send/index.ts
// Sends an email via Gmail API using the user's connected account

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback env vars
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

        const { to, subject, body, cc, bcc } = await req.json();

        if (!to || !subject || !body) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

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

        // Use Service Role to get credentials (hidden from normal users if needed, though RLS allows read)
        // But here we need to write logs/update tokens potentially, so service role is good.
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
            return new Response(JSON.stringify({ error: 'Invalid credentials stored' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const accessToken = await getValidAccessToken(supabaseAdmin, companyId, credentials);

        // Construct email
        const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
        const messageParts = [
            `To: ${to}`,
            `Subject: ${utf8Subject}`,
            `Content-Type: text/html; charset=utf-8`,
            `MIME-Version: 1.0`,
            ``,
            body
        ];

        if (cc) messageParts.splice(1, 0, `Cc: ${cc.join(', ')}`);
        if (bcc) messageParts.splice(2, 0, `Bcc: ${bcc.join(', ')}`);

        const message = messageParts.join('\n');
        const encodedMessage = btoa(unescape(encodeURIComponent(message)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: encodedMessage })
        });

        const sendData = await sendRes.json();

        if (sendData.error) {
            throw new Error(`Gmail API error: ${sendData.error.message}`);
        }

        // Log success
        await supabaseAdmin.from('integration_logs').insert({
            company_id: companyId,
            integration_type: 'gmail_send',
            event_type: 'email_sent',
            status: 'success',
            request_data: { to, subject },
            response_data: sendData,
        });

        return new Response(JSON.stringify(sendData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
