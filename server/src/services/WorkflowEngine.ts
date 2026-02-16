import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Service Role for backend)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''; // Fallback for dev

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Supabase URL or Key missing in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface WorkflowDefinition {
    id: string;
    name: string;
    flow_definition: {
        nodes: any[];
        edges: any[];
    };
    trigger_config: {
        event: string;
        [key: string]: any;
    };
}

export interface ExecutionContext {
    workflowId: string;
    executionId: string;
    triggerEvent: string;
    triggerData: any;
    variables: any;
    steps: any[];
    currentNodeId: string | null;
    startTime: number;
}

// resolve {{variables}}
function resolveVariables(text: string, context: ExecutionContext): string {
    if (!text) return text;
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const parts = path.trim().split('.');
        let value: any = context.variables;
        for (const part of parts) {
            if (value === null || value === undefined) return match;
            value = value[part];
        }
        return value !== undefined && value !== null ? String(value) : match;
    });
}

// Action Executors
async function sendEmail(data: any, context: ExecutionContext) {
    const to = resolveVariables(data.to, context);
    const subject = resolveVariables(data.subject, context);
    const body = resolveVariables(data.body, context);

    // Call functionality from existing index.ts (or replicate fetch logic)
    // For now, logging. In real implementation, invoke email service.
    console.log(`[Email] To: ${to}, Subject: ${subject}`);
    return { success: true, output: { sent: true, to } };
}

async function createTask(data: any, context: ExecutionContext) {
    const title = resolveVariables(data.title, context);
    const priority = data.priority || 'medium';

    const { data: task, error } = await supabase.from('tasks').insert({
        title,
        priority,
        entity_type: context.variables.entity_type,
        entity_id: context.variables.entity_id,
        status: 'pending'
    }).select().single();

    if (error) throw error;
    return { success: true, output: { taskId: task.id } };
}

// Node Execution Logic
interface NodeExecutionResult {
    success: boolean;
    output?: any;
    error?: string;
    nextNodeIds?: string[];
}

async function executeNode(node: any, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {
        switch (node.type) {
            case 'trigger': return { success: true };

            case 'action':
                if (node.data.actionType === 'send_email') return await sendEmail(node.data.config, context);
                if (node.data.actionType === 'create_task') return await createTask(node.data.config, context);
                return { success: true }; // Unknown action

            case 'condition':
                const field = node.data.config?.field;
                const operator = node.data.config?.operator;
                const value = node.data.config?.value;
                const resolvedField = resolveVariables(field, context);
                // simplified logic
                const result = resolvedField == value;
                return { success: true, output: { result }, nextNodeIds: [] }; // Edges handle flow

            default: return { success: true };
        }
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// Main Execution Function
export async function executeWorkflow(workflow: WorkflowDefinition, triggerEvent: string, triggerData: any) {
    console.log(`[Workflow] Starting ${workflow.name} (${workflow.id})`);

    const { data: execution } = await supabase.from('workflow_executions').insert({
        workflow_id: workflow.id,
        trigger_event: triggerEvent,
        trigger_data: triggerData,
        status: 'running',
        entity_type: triggerData.entity_type,
        entity_id: triggerData.entity_id
    }).select().single();

    if (!execution) {
        console.error('Failed to create execution record');
        return;
    }

    const context: ExecutionContext = {
        workflowId: workflow.id,
        executionId: execution.id,
        triggerEvent,
        triggerData,
        variables: { ...triggerData, system: { date: new Date().toISOString() } },
        steps: [],
        currentNodeId: null,
        startTime: Date.now()
    };

    const nodes = workflow.flow_definition.nodes;
    const edges = workflow.flow_definition.edges;

    // Find start node
    const startNode = nodes.find(n => n.type === 'trigger');
    if (!startNode) return;

    const queue = [startNode];
    const visited = new Set();

    while (queue.length > 0) {
        const node = queue.shift();
        if (!node || visited.has(node.id)) continue;
        visited.add(node.id);

        // Execute
        const result = await executeNode(node, context);

        // Log Step
        context.steps.push({
            node_id: node.id,
            status: result.success ? 'completed' : 'failed',
            output: result.output,
            error: result.error
        });

        await supabase.from('workflow_executions').update({
            steps_executed: context.steps,
            current_step_id: node.id
        }).eq('id', execution.id);

        if (!result.success) {
            await supabase.from('workflow_executions').update({ status: 'failed', error_message: result.error }).eq('id', execution.id);
            return;
        }

        // Find next nodes
        const outgoingEdges = edges.filter((e: any) => e.source === node.id);
        // TODO: Handle condition branching using handles (true/false)

        outgoingEdges.forEach((edge: any) => {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode) queue.push(targetNode);
        });
    }

    await supabase.from('workflow_executions').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - context.startTime
    }).eq('id', execution.id);

    console.log(`[Workflow] Completed ${workflow.name}`);
}

export async function triggerWorkflows(event: string, data: any) {
    const { data: workflows } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('is_active', true);

    if (!workflows) return;

    const matching = workflows.filter((w: any) => w.trigger_config?.event === event);

    for (const w of matching) {
        executeWorkflow(w, event, data);
    }
}
