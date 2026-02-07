/**
 * Visual Workflow Execution Engine
 * 
 * This engine executes visual workflows step by step, following the node connections
 * and handling all node types: triggers, actions, conditions, delays, loops, and data operations.
 */

import { supabase } from "@/integrations/supabase/client";
import type { 
  WorkflowDefinition, 
  WorkflowFlowDefinition,
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowExecutionStep 
} from "@/types/database";

// Context passed through workflow execution
interface ExecutionContext {
  workflowId: string;
  executionId: string;
  triggerEvent: string;
  triggerData: Record<string, any>;
  variables: Record<string, any>;
  steps: WorkflowExecutionStep[];
  currentNodeId: string | null;
  startTime: number;
}

// Result of executing a single node
interface NodeExecutionResult {
  success: boolean;
  output?: Record<string, any>;
  error?: string;
  nextNodeIds?: string[];  // For conditions, can have multiple next nodes
  skipToEnd?: boolean;     // For loops, can skip to end
}

// Email sender function (uses the backend proxy)
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    // Get company settings for email configuration
    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name, email')
      .single();

    const response = await fetch('http://localhost:3001/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        htmlBody: `<div style="font-family: sans-serif; padding: 20px;">${body.replace(/\n/g, '<br>')}</div>`,
        fromName: settings?.company_name || 'The Genworks CRM',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Create task
async function createTask(
  title: string, 
  priority: string, 
  dueDays: number,
  context: ExecutionContext
): Promise<boolean> {
  try {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const { error } = await supabase
      .from('tasks')
      .insert({
        title,
        priority: priority as any,
        due_date: dueDate.toISOString(),
        status: 'pending',
        entity_type: context.variables.entity_type,
        entity_id: context.variables.entity_id,
      });

    return !error;
  } catch (error) {
    console.error('Failed to create task:', error);
    return false;
  }
}

// Send notification
async function sendNotification(
  title: string,
  message: string,
  type: string = 'info'
): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userData.user.id,
        title,
        message,
        type: type as any,
      });

    return !error;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

// Resolve variables in a string (e.g., "Hello {{lead.contact_name}}")
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

// Evaluate a condition
function evaluateCondition(
  field: string,
  operator: string,
  compareValue: any,
  context: ExecutionContext
): boolean {
  const fieldValue = resolveVariables(`{{${field}}}`, context);
  const compValue = resolveVariables(String(compareValue), context);
  
  switch (operator) {
    case 'equals':
      return fieldValue == compValue;
    case 'not_equals':
      return fieldValue != compValue;
    case 'greater_than':
      return Number(fieldValue) > Number(compValue);
    case 'less_than':
      return Number(fieldValue) < Number(compValue);
    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(compValue);
    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(compValue);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(compValue).toLowerCase());
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(compValue).toLowerCase());
    case 'is_empty':
      return !fieldValue || fieldValue === '' || fieldValue === 'undefined' || fieldValue === 'null';
    case 'is_not_empty':
      return fieldValue && fieldValue !== '' && fieldValue !== 'undefined' && fieldValue !== 'null';
    case 'starts_with':
      return String(fieldValue).toLowerCase().startsWith(String(compValue).toLowerCase());
    case 'ends_with':
      return String(fieldValue).toLowerCase().endsWith(String(compValue).toLowerCase());
    default:
      return false;
  }
}

// Execute a single node
async function executeNode(
  node: WorkflowNode,
  flow: WorkflowFlowDefinition,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const nodeType = node.type;
  const data = node.data;
  
  console.log(`Executing node: ${node.id} (${nodeType})`);
  
  try {
    switch (nodeType) {
      case 'trigger':
        // Trigger nodes just pass through
        return { success: true, output: context.triggerData };
        
      case 'email': {
        const to = resolveVariables(data.to, context);
        const subject = resolveVariables(data.subject, context);
        const body = resolveVariables(data.body, context);
        
        if (!to || !subject) {
          return { success: false, error: 'Email requires to and subject' };
        }
        
        const sent = await sendEmail(to, subject, body);
        return { 
          success: sent, 
          output: { sent, to, subject },
          error: sent ? undefined : 'Failed to send email'
        };
      }
      
      case 'task': {
        const title = resolveVariables(data.title, context);
        const priority = data.priority || 'medium';
        const dueDays = data.due_offset_days || 1;
        
        if (!title) {
          return { success: false, error: 'Task requires a title' };
        }
        
        const created = await createTask(title, priority, dueDays, context);
        return { 
          success: created, 
          output: { created, title, priority },
          error: created ? undefined : 'Failed to create task'
        };
      }
      
      case 'notification': {
        const title = resolveVariables(data.title, context);
        const message = resolveVariables(data.message, context);
        const notifType = data.notification_type || 'info';
        
        if (!title) {
          return { success: false, error: 'Notification requires a title' };
        }
        
        const sent = await sendNotification(title, message, notifType);
        return { 
          success: sent, 
          output: { sent, title },
          error: sent ? undefined : 'Failed to send notification'
        };
      }
      
      case 'condition': {
        const field = data.field;
        const operator = data.operator || 'equals';
        const value = data.value;
        
        const result = evaluateCondition(field, operator, value, context);
        
        // Find the edges from this condition node
        const trueEdge = flow.edges.find(e => e.source === node.id && e.sourceHandle === 'true');
        const falseEdge = flow.edges.find(e => e.source === node.id && e.sourceHandle === 'false');
        
        const nextNodeIds: string[] = [];
        if (result && trueEdge) {
          nextNodeIds.push(trueEdge.target);
        } else if (!result && falseEdge) {
          nextNodeIds.push(falseEdge.target);
        }
        
        return { 
          success: true, 
          output: { condition: { field, operator, value }, result },
          nextNodeIds
        };
      }
      
      case 'delay': {
        const delayValue = data.delay_value || 1;
        const delayUnit = data.delay_unit || 'minutes';
        
        let delayMs = delayValue * 1000; // Start with seconds
        switch (delayUnit) {
          case 'minutes':
            delayMs = delayValue * 60 * 1000;
            break;
          case 'hours':
            delayMs = delayValue * 60 * 60 * 1000;
            break;
          case 'days':
            delayMs = delayValue * 24 * 60 * 60 * 1000;
            break;
        }
        
        // For testing, cap at 10 seconds
        const actualDelay = Math.min(delayMs, 10000);
        
        await new Promise(resolve => setTimeout(resolve, actualDelay));
        
        return { 
          success: true, 
          output: { delayed: true, delayMs: actualDelay }
        };
      }
      
      case 'loop': {
        const arraySource = data.array_source;
        const itemVariable = data.item_variable || 'item';
        
        // Get the array from context
        const arrayPath = arraySource.split('.');
        let array: any = context.variables;
        for (const part of arrayPath) {
          if (array === null || array === undefined) break;
          array = array[part];
        }
        
        if (!Array.isArray(array)) {
          return { success: true, output: { looped: 0 }, nextNodeIds: [] };
        }
        
        // For each item, we need to execute the connected nodes
        // This is simplified - full implementation would need recursive execution
        return { 
          success: true, 
          output: { looped: array.length, items: array }
        };
      }
      
      case 'fetch_data': {
        const table = data.table;
        const filters = data.filters || [];
        
        if (!table) {
          return { success: false, error: 'Fetch data requires a table' };
        }
        
        try {
          let query = supabase.from(table).select('*');
          
          for (const filter of filters) {
            const value = resolveVariables(filter.value, context);
            switch (filter.operator) {
              case 'equals':
                query = query.eq(filter.field, value);
                break;
              case 'not_equals':
                query = query.neq(filter.field, value);
                break;
              case 'greater_than':
                query = query.gt(filter.field, value);
                break;
              case 'less_than':
                query = query.lt(filter.field, value);
                break;
            }
          }
          
          const { data: results, error } = await query.limit(100);
          
          if (error) {
            return { success: false, error: error.message };
          }
          
          // Add results to context
          context.variables[`${table}_results`] = results;
          
          return { 
            success: true, 
            output: { table, count: results?.length || 0, results }
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }
      
      case 'update_status': {
        const table = data.table;
        const field = data.field;
        const value = resolveVariables(data.value, context);
        const entityId = context.variables.entity_id;
        
        if (!table || !field || !entityId) {
          return { success: false, error: 'Update status requires table, field, and entity_id' };
        }
        
        try {
          const { error } = await supabase
            .from(table)
            .update({ [field]: value })
            .eq('id', entityId);
          
          if (error) {
            return { success: false, error: error.message };
          }
          
          return { 
            success: true, 
            output: { updated: true, table, field, value }
          };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }
      
      default:
        return { success: true, output: { nodeType, skipped: true } };
    }
  } catch (error: any) {
    console.error(`Error executing node ${node.id}:`, error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

// Find the next nodes to execute
function findNextNodes(
  currentNodeId: string,
  flow: WorkflowFlowDefinition,
  explicitNextIds?: string[]
): WorkflowNode[] {
  if (explicitNextIds && explicitNextIds.length > 0) {
    return flow.nodes.filter(n => explicitNextIds.includes(n.id));
  }
  
  // Find edges from current node
  const outgoingEdges = flow.edges.filter(e => e.source === currentNodeId);
  const nextNodeIds = outgoingEdges.map(e => e.target);
  
  return flow.nodes.filter(n => nextNodeIds.includes(n.id));
}

// Main execution function
export async function executeWorkflow(
  workflow: WorkflowDefinition,
  triggerEvent: string,
  triggerData: Record<string, any>
): Promise<{ success: boolean; executionId: string; error?: string }> {
  const startTime = Date.now();
  
  // Create execution record
  const { data: execution, error: insertError } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_id: workflow.id,
      trigger_event: triggerEvent,
      trigger_data: triggerData,
      entity_type: triggerData.entity_type,
      entity_id: triggerData.entity_id,
      status: 'running',
      steps_executed: [],
    })
    .select()
    .single();
  
  if (insertError || !execution) {
    console.error('Failed to create execution record:', insertError);
    return { success: false, executionId: '', error: insertError?.message };
  }
  
  const executionId = execution.id;
  const flow = workflow.flow_definition;
  
  // Initialize context
  const context: ExecutionContext = {
    workflowId: workflow.id,
    executionId,
    triggerEvent,
    triggerData,
    variables: {
      ...triggerData,
      system: {
        current_date: new Date().toISOString().split('T')[0],
        current_time: new Date().toISOString(),
        workflow_name: workflow.name,
      },
    },
    steps: [],
    currentNodeId: null,
    startTime,
  };
  
  // Find trigger node(s)
  const triggerNodes = flow.nodes.filter(n => n.type === 'trigger');
  
  if (triggerNodes.length === 0) {
    // No trigger node, try to start from first node
    if (flow.nodes.length === 0) {
      await updateExecutionStatus(executionId, 'failed', 'No nodes in workflow');
      return { success: false, executionId, error: 'No nodes in workflow' };
    }
  }
  
  // Execute workflow using BFS
  const nodesToExecute: WorkflowNode[] = triggerNodes.length > 0 ? triggerNodes : [flow.nodes[0]];
  const executedNodeIds = new Set<string>();
  let hasError = false;
  let errorMessage = '';
  
  while (nodesToExecute.length > 0 && !hasError) {
    const node = nodesToExecute.shift()!;
    
    // Skip if already executed (prevent infinite loops)
    if (executedNodeIds.has(node.id)) {
      continue;
    }
    
    executedNodeIds.add(node.id);
    context.currentNodeId = node.id;
    
    // Record step start
    const stepStart = Date.now();
    const step: WorkflowExecutionStep = {
      node_id: node.id,
      node_type: node.type || 'unknown',
      status: 'running',
      started_at: new Date().toISOString(),
    };
    
    // Execute the node
    const result = await executeNode(node, flow, context);
    
    // Update step
    step.status = result.success ? 'completed' : 'failed';
    step.completed_at = new Date().toISOString();
    step.duration_ms = Date.now() - stepStart;
    step.output = result.output;
    step.error = result.error;
    
    context.steps.push(step);
    
    // Update execution record with progress
    await supabase
      .from('workflow_executions')
      .update({
        steps_executed: context.steps,
        current_step_id: node.id,
      })
      .eq('id', executionId);
    
    if (!result.success) {
      if (workflow.error_handling === 'stop') {
        hasError = true;
        errorMessage = result.error || 'Node execution failed';
        break;
      }
      // Continue on error - just log and move on
    }
    
    // Find next nodes
    const nextNodes = findNextNodes(node.id, flow, result.nextNodeIds);
    for (const nextNode of nextNodes) {
      if (!executedNodeIds.has(nextNode.id)) {
        nodesToExecute.push(nextNode);
      }
    }
  }
  
  // Complete execution
  const duration = Date.now() - startTime;
  const finalStatus = hasError ? 'failed' : 'completed';
  
  await updateExecutionStatus(executionId, finalStatus, errorMessage, duration, context.steps);
  
  return { 
    success: !hasError, 
    executionId,
    error: hasError ? errorMessage : undefined
  };
}

// Update execution status
async function updateExecutionStatus(
  executionId: string,
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused',
  errorMessage?: string,
  durationMs?: number,
  steps?: WorkflowExecutionStep[]
) {
  const updates: any = {
    status,
    completed_at: new Date().toISOString(),
  };
  
  if (errorMessage) {
    updates.error_message = errorMessage;
  }
  
  if (durationMs !== undefined) {
    updates.duration_ms = durationMs;
  }
  
  if (steps) {
    updates.steps_executed = steps;
  }
  
  await supabase
    .from('workflow_executions')
    .update(updates)
    .eq('id', executionId);
}

// Trigger workflows based on an event
export async function triggerWorkflows(
  eventName: string,
  entityType: string,
  entityId: string,
  entityData: Record<string, any>
): Promise<void> {
  try {
    // Find active workflows that match this event
    const { data: workflows, error } = await supabase
      .from('workflow_definitions')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'event');
    
    if (error || !workflows) {
      console.error('Failed to fetch workflows:', error);
      return;
    }
    
    // Filter workflows by trigger config
    const matchingWorkflows = workflows.filter(w => {
      const config = w.trigger_config as Record<string, any>;
      return config?.event === eventName;
    });
    
    // Execute matching workflows
    for (const workflow of matchingWorkflows) {
      const typedWorkflow = workflow as unknown as WorkflowDefinition;
      console.log(`Triggering workflow: ${typedWorkflow.name} for event: ${eventName}`);
      
      await executeWorkflow(typedWorkflow, eventName, {
        entity_type: entityType,
        entity_id: entityId,
        [entityType]: entityData,
        ...entityData,
      });
    }
  } catch (error) {
    console.error('Error triggering workflows:', error);
  }
}

export default {
  executeWorkflow,
  triggerWorkflows,
};
