import { supabase } from '@/integrations/supabase/client';

export type AutomationEvent =
    | 'lead_created'
    | 'lead_qualified'
    | 'quotation_status_changed'
    | 'deal_won'
    | 'deal_lost'
    | 'task_assigned';

export async function handleAutomationEvent(
    eventType: AutomationEvent,
    entityType: string,
    entityId: string,
    data: any
) {
    try {
        // 1. Fetch active rules for this trigger event
        const { data: rules, error } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('trigger_event', eventType)
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching automation rules:', error);
            return;
        }

        if (!rules || rules.length === 0) return;

        // 2. Process each rule
        for (const rule of rules) {
            if (evaluateConditions(rule.trigger_conditions, data)) {
                await executeActions(rule, entityType, entityId, data);
            }
        }
    } catch (err) {
        console.error('Automation Engine Error:', err);
    }
}

function evaluateConditions(conditions: any, data: any): boolean {
    if (!conditions || (Array.isArray(conditions) && conditions.length === 0)) return true;

    // Basic implementation of condition evaluation
    // Logic: All conditions (AND) must be met
    if (Array.isArray(conditions)) {
        return conditions.every(condition => {
            const { field, operator, value } = condition;
            const actualValue = data[field];

            switch (operator) {
                case 'equals': return actualValue === value;
                case 'not_equals': return actualValue !== value;
                case 'greater_than': return Number(actualValue) > Number(value);
                case 'less_than': return Number(actualValue) < Number(value);
                case 'contains': return String(actualValue).includes(String(value));
                default: return true;
            }
        });
    }

    return true;
}

async function executeActions(rule: any, entityType: string, entityId: string, data: any) {
    const startTime = Date.now();
    const executedActions: any[] = [];
    let status: 'success' | 'failed' = 'success';
    let errorMessage: string | null = null;

    try {
        const actions = rule.actions;
        for (const action of actions) {
            const result = await performAction(action, data);
            executedActions.push({ type: action.type, result });
        }
    } catch (err: any) {
        status = 'failed';
        errorMessage = err.message;
        console.error(`Action execution failed for rule ${rule.id}:`, err);
    }

    // Log execution
    await supabase.from('automation_logs').insert({
        rule_id: rule.id,
        entity_type: entityType,
        entity_id: entityId,
        trigger_event: rule.trigger_event,
        actions_executed: executedActions,
        status,
        error_message: errorMessage,
        execution_time_ms: Date.now() - startTime
    });

    // Update rule stats
    await supabase.rpc('increment_rule_execution', { rule_id: rule.id });
}

async function performAction(action: any, data: any) {
    switch (action.type) {
        case 'create_deal':
            return await createDealAction(action, data);
        case 'send_email':
            return { status: 'sent', message: 'Email logic simulated' };
        case 'log_activity':
            return { status: 'logged', message: 'Activity logged' };
        default:
            throw new Error(`Unknown action type: ${action.type}`);
    }
}

async function createDealAction(action: any, data: any) {
    // logic to create a deal based on lead data
    const leadId = data.id || data.lead_id;
    if (!leadId) throw new Error('Lead ID missing for deal creation');

    const { data: newDeal, error } = await supabase
        .from('deals')
        .insert({
            lead_id: leadId,
            stage: action.config?.stage || 'qualified',
            deal_value: data.deal_value || 0,
            probability: action.config?.probability || 25,
        })
        .select()
        .single();

    if (error) throw error;
    return newDeal;
}
