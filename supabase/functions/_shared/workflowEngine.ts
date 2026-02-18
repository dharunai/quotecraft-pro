
// Shared Workflow Engine Logic

export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in_list';

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface WorkflowTriggerConfig {
  conditions_enabled?: boolean;
  conditions?: WorkflowCondition[];
  webhook_secret?: string;
  [key: string]: any;
}

/**
 * Evaluates a single condition against the provided data
 */
export function evaluateCondition(condition: WorkflowCondition, data: Record<string, any>): boolean {
  const { field, operator, value } = condition;
  
  // Navigate nested fields (e.g., "user.email")
  const fieldPath = field.split('.');
  let currentValue: any = data;
  
  for (const key of fieldPath) {
    if (currentValue === undefined || currentValue === null) {
      return false; // Field not found
    }
    currentValue = currentValue[key];
  }

  // Convert values for comparison if needed
  const stringValue = String(currentValue).toLowerCase();
  const targetValue = String(value).toLowerCase();
  
  switch (operator) {
    case 'equals':
      return stringValue === targetValue;
      
    case 'not_equals':
      return stringValue !== targetValue;
      
    case 'contains':
      return stringValue.includes(targetValue);
      
    case 'greater_than':
      return Number(currentValue) > Number(value);
      
    case 'less_than':
      return Number(currentValue) < Number(value);
      
    case 'in_list':
      const list = targetValue.split(',').map(item => item.trim());
      return list.includes(stringValue);
      
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Evaluates all conditions for a workflow trigger
 * Returns true if all conditions pass (AND logic)
 */
export function evaluateTriggerConditions(config: WorkflowTriggerConfig, data: Record<string, any>): boolean {
  if (!config.conditions_enabled || !config.conditions || config.conditions.length === 0) {
    return true; // No conditions to check
  }

  for (const condition of config.conditions) {
    const passed = evaluateCondition(condition, data);
    if (!passed) {
      console.log(`Condition failed: ${condition.field} ${condition.operator} ${condition.value} (Value: ${JSON.stringify(data[condition.field])})`);
      return false;
    }
  }

  console.log('All conditions passed');
  return true;
}

/**
 * Mock function to execute a workflow
 * In production, this would likely queue the workflow execution
 */
export async function executeWorkflow(workflowId: string, triggerData: any, supabaseClient: any) {
  console.log(`Executing workflow ${workflowId} with data:`, triggerData);
  
  // Log execution to DB
  const { error } = await supabaseClient
    .from('workflow_executions')
    .insert({
      workflow_id: workflowId,
      trigger_event: 'webhook',
      trigger_data: triggerData,
      status: 'pending',
      started_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error logging workflow execution:', error);
    throw error;
  }

  // TODO: Implement actual execution logic (step by step)
  // For now, we just mark it as completed to show it worked
  await supabaseClient
    .from('workflow_executions')
    .update({ 
      status: 'completed', 
      completed_at: new Date().toISOString() 
    })
    .eq('workflow_id', workflowId)
    .eq('status', 'pending');

  return { success: true };
}
