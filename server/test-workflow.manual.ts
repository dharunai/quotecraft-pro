import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// Dynamic import to ensure env vars are loaded first
const { supabase, triggerWorkflows } = await import('./src/services/WorkflowEngine.ts');

async function testWorkflow() {
    console.log('🧪 Starting Workflow Verification...');

    // 1. Create a Test Workflow
    const uniqueId = Date.now();
    const workflowName = `Test Workflow ${uniqueId}`;

    console.log(`Creating workflow: ${workflowName}`);

    const { data: workflow, error } = await supabase
        .from('workflow_definitions')
        .insert({
            name: workflowName,
            is_active: true,
            trigger_config: { event: 'test_event' },
            flow_definition: {
                nodes: [
                    { id: '1', type: 'trigger', data: { label: 'Start' } },
                    {
                        id: '2',
                        type: 'action',
                        data: {
                            label: 'Log Action',
                            actionType: 'send_email', // Mock email
                            config: { to: 'test@example.com', subject: 'Test {{name}}', body: 'Hello' }
                        }
                    }
                ],
                edges: [
                    { id: 'e1-2', source: '1', target: '2' }
                ]
            }
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Failed to create workflow:', error);
        process.exit(1);
    }

    console.log(`✅ Workflow created (ID: ${workflow.id})`);

    // 2. Trigger Workflow
    console.log('Triggering workflow...');
    await triggerWorkflows('test_event', { name: 'Developer', entity_type: 'test', entity_id: workflow.id });

    // 3. Verify Execution
    console.log('Verifying execution...');

    // Wait a bit for async execution
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: executions, error: execError } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (execError) {
        console.error('❌ Failed to fetch executions:', execError);
        process.exit(1);
    }

    if (!executions || executions.length === 0) {
        console.error('❌ No execution found!');
        process.exit(1);
    }

    const execution = executions[0];
    console.log(`Execution Status: ${execution.status}`);

    if (execution.status === 'completed') {
        console.log('✅ Workflow executed successfully!');
    } else {
        console.error('❌ Workflow execution failed or is stuck.');
        console.log('Steps:', JSON.stringify(execution.steps_executed, null, 2));
        process.exit(1);
    }

    // Cleanup
    await supabase.from('workflow_definitions').delete().eq('id', workflow.id);
    console.log('🧹 Cleanup done.');
}

testWorkflow().catch(console.error);
