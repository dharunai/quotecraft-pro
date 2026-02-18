
// supabase/functions/google-oauth/index.ts
// Handles Google OAuth2 flow: generates auth URL and processes callback

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback env vars (optional)
const ENV_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const ENV_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const ENV_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI');
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// Helper to construct Redirect URI safely
function getRedirectUri() {
    if (ENV_REDIRECT_URI) return ENV_REDIRECT_URI;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (supabaseUrl) {
        // Remove trailing slash if present
        const cleanUrl = supabaseUrl.replace(/\/$/, '');
        return `${cleanUrl}/functions/v1/google-oauth?action=callback`;
    }
    return null;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const url = new URL(req.url); // Use query params from the REQUEST URL
    const action = url.searchParams.get('action');

    // ── Action: generate-url ──────────────────────────────────────────────────
    if (action === 'generate-url') {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
        const companyId = teamMember?.company_id;

        if (!companyId) {
            return new Response(JSON.stringify({ error: 'No company found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Fetch config from DB
        const { data: integration } = await supabase
            .from('integrations')
            .select('config')
            .eq('company_id', companyId)
            .eq('integration_type', 'google_workspace')
            .maybeSingle();

        const config = integration?.config as any || {};
        const clientId = config.client_id || ENV_CLIENT_ID;
        const redirectUri = getRedirectUri();

        if (!clientId || !redirectUri) {
            return new Response(JSON.stringify({ error: 'Google Client ID not configured' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: SCOPES,
            access_type: 'offline',
            prompt: 'consent', // FORCE refresh token generation
            state: companyId,
        });

        return new Response(JSON.stringify({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // ── Action: callback ──────────────────────────────────────────────────────
    if (action === 'callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state'); // company_id
        const error = url.searchParams.get('error');

        // Handle errors returned by Google directly
        if (error) {
            return Response.redirect(`${APP_URL}/settings/integrations?error=${encodeURIComponent(error)}`);
        }
        if (!code || !state) {
            return Response.redirect(`${APP_URL}/settings/integrations?error=missing_params`);
        }

        const companyId = state;
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // Fetch config from DB to get Secret
        const { data: integration } = await supabaseAdmin
            .from('integrations')
            .select('*') // Get full row to check existing credentials
            .eq('company_id', companyId)
            .eq('integration_type', 'google_workspace')
            .maybeSingle();

        const config = integration?.config as any || {};
        const clientId = config.client_id || ENV_CLIENT_ID;
        const clientSecret = config.client_secret || ENV_CLIENT_SECRET;
        const redirectUri = getRedirectUri();

        if (!clientId || !clientSecret || !redirectUri) {
            return Response.redirect(`${APP_URL}/settings/integrations?error=config_missing_in_backend`);
        }

        try {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }),
            });

            const tokens = await tokenRes.json();

            // Handle Token Exchange Errors (e.g. invalid_grant, redirect_uri_mismatch)
            if (tokens.error) {
                console.error('Token exchange error:', tokens);
                const errorDesc = tokens.error_description || tokens.error;
                return Response.redirect(`${APP_URL}/settings/integrations?error=${encodeURIComponent('Google: ' + errorDesc)}`);
            }

            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            const userInfo = await userInfoRes.json();

            // PRESERVE REFRESH TOKEN logic
            let refreshToken = tokens.refresh_token;
            if (!refreshToken && integration?.credentials) {
                try {
                    const oldCreds = JSON.parse(atob(integration.credentials));
                    if (oldCreds.refresh_token) {
                        console.log('Preserving old refresh token');
                        refreshToken = oldCreds.refresh_token;
                    }
                } catch (e) { /* ignore */ }
            }

            const credentialsPayload = JSON.stringify({
                access_token: tokens.access_token,
                refresh_token: refreshToken,
                expiry_date: Date.now() + (tokens.expires_in * 1000),
                scope: tokens.scope,
                token_type: tokens.token_type,
                google_email: userInfo.email,
                google_name: userInfo.name,
            });

            const encodedCredentials = btoa(credentialsPayload);

            // Save config AND credentials
            const newConfig = {
                ...config,
                google_email: userInfo.email,
                google_name: userInfo.name, // Display name
                scopes: tokens.scope,
            };

            await supabaseAdmin.from('integrations').upsert({
                company_id: companyId,
                integration_type: 'google_workspace',
                is_enabled: true,
                credentials: encodedCredentials,
                config: newConfig,
                connected_at: new Date().toISOString(),
                sync_status: 'idle',
                error_message: null,
            }, { onConflict: 'company_id,integration_type' });

            await supabaseAdmin.from('integration_logs').insert({
                company_id: companyId,
                integration_type: 'google_workspace',
                event_type: 'oauth_connected',
                status: 'success',
                response_data: { google_email: userInfo.email },
            });

            return Response.redirect(`${APP_URL}/settings/integrations?success=google_connected`);
        } catch (err: any) {
            console.error('OAuth Error:', err);
            return Response.redirect(`${APP_URL}/settings/integrations?error=${encodeURIComponent(err.message)}`);
        }
    }

    // ── Action: disconnect ────────────────────────────────────────────────────
    if (action === 'disconnect' && req.method === 'POST') {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const { data: teamMember } = await supabase.from('team_members').select('company_id').eq('user_id', user.id).single();

        if (teamMember?.company_id) {
            await supabase.from('integrations')
                .update({ is_enabled: false, credentials: null, connected_at: null, sync_status: 'idle' })
                .eq('company_id', teamMember.company_id)
                .eq('integration_type', 'google_workspace');
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
});
