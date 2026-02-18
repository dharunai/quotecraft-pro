
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluateTriggerConditions, executeWorkflow } from "../_shared/workflowEngine.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        // Extract webhook_id from URL path (e.g., /incoming-webhook?id=xyz OR path /incoming-webhook/xyz)
        // For simplicity, we'll look for a query param ?id=... or body param
        // But typically webhooks are hit at a specific URL. 
        // Let's assume the ID is passed as a query parameter: /incoming-webhook?id=...
        const webhookId = url.searchParams.get('id');

        if (!webhookId) {
            return new Response(
                JSON.stringify({ error: 'Missing webhook ID' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch the workflow configuration
        // We need to find workflows that have this webhook_id in their trigger_config
        const { data: workflows, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('is_active', true)
            .eq('trigger_type', 'webhook')
            .filter('trigger_config->>webhook_id', 'eq', webhookId);

        if (error) {
            console.error('Error fetching workflows:', error);
            return new Response(
                JSON.stringify({ error: 'Database error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!workflows || workflows.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No active workflow found for this webhook ID' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        let payload = {};
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            payload = await req.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await req.formData();
            const obj: Record<string, any> = {};
            formData.forEach((value, key) => {
                obj[key] = value;
            });
            payload = obj;
        } else {
            payload = { text: await req.text() };
        }

        console.log(`Received webhook for ID ${webhookId}. Found ${workflows.length} workflows.`);

        const results = [];

        // Process each matching workflow
        for (const workflow of workflows) {
            const config = workflow.trigger_config;

            // 1. Verify Secret (if configured)
            if (config.webhook_secret) {
                const providedSecret = req.headers.get('x-webhook-secret');
                if (providedSecret !== config.webhook_secret) {
                    console.warn(`Invalid secret for workflow ${workflow.id}`);
                    results.push({ workflowId: workflow.id, status: 'skipped', reason: 'Invalid secret' });
                    continue;
                }
            }

            // 2. Evaluate Conditions
            if (!evaluateTriggerConditions(config, payload)) {
                console.log(`Conditions failed for workflow ${workflow.id}`);
                results.push({ workflowId: workflow.id, status: 'skipped', reason: 'Conditions failed' });
                continue;
            }

            // 3. Execute Workflow
            try {
                await executeWorkflow(workflow.id, payload, supabase);
                results.push({ workflowId: workflow.id, status: 'triggered' });
            } catch (err) {
                console.error(`Failed to execute workflow ${workflow.id}:`, err);
                results.push({ workflowId: workflow.id, status: 'failed', error: String(err) });
            }
        }

        return new Response(
            JSON.stringify({ success: true, results }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal Server Error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
