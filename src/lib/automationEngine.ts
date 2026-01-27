// Automation Engine - Executes automation rules based on triggers
import { supabase } from '@/integrations/supabase/client';
import { sendEmail } from './emailService';
import { toast } from 'sonner';

export type AutomationEvent =
  | 'lead_created'
  | 'lead_qualified'
  | 'deal_created'
  | 'deal_won'
  | 'deal_lost'
  | 'quotation_sent'
  | 'quotation_accepted'
  | 'quotation_rejected'
  | 'invoice_created'
  | 'invoice_paid'
  | 'task_overdue'
  | 'task_completed';

interface AutomationAction {
  type: 'send_email' | 'create_task' | 'send_notification' | 'update_status';
  value?: string;
  [key: string]: any;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger_event: string;
  trigger_conditions: Record<string, any> | null;
  actions: AutomationAction;
  is_active: boolean;
}

interface EventData {
  lead?: {
    id: string;
    company_name: string;
    contact_name: string;
    email?: string;
    phone?: string;
  };
  deal?: {
    id: string;
    deal_value?: number;
    stage?: string;
  };
  quotation?: {
    id: string;
    quote_number: string;
    total?: number;
  };
  invoice?: {
    id: string;
    invoice_number: string;
    grand_total?: number;
  };
  task?: {
    id: string;
    title: string;
  };
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
}

// Fetch active automation rules for a given trigger event
async function getMatchingRules(eventType: AutomationEvent): Promise<AutomationRule[]> {
  try {
    console.log(`[Automation] Fetching rules for event: ${eventType}`);
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('trigger_event', eventType)
      .eq('is_active', true);

    if (error) {
      console.error('[Automation] Error fetching automation rules:', error);
      return [];
    }

    console.log(`[Automation] Found ${data?.length || 0} active rule(s) for ${eventType}:`, data);
    return (data || []) as AutomationRule[];
  } catch (error) {
    console.error('[Automation] Error in getMatchingRules:', error);
    return [];
  }
}

// Execute a single automation action
async function executeAction(
  action: AutomationAction,
  eventData: EventData,
  rule: AutomationRule
): Promise<boolean> {
  try {
    switch (action.type) {
      case 'send_email':
        return await executeSendEmail(action, eventData, rule);
      case 'create_task':
        return await executeCreateTask(action, eventData, rule);
      case 'send_notification':
        return await executeNotification(action, eventData, rule);
      case 'update_status':
        return await executeUpdateStatus(action, eventData, rule);
      default:
        console.warn(`Unknown action type: ${action.type}`);
        return false;
    }
  } catch (error) {
    console.error(`Error executing action ${action.type}:`, error);
    return false;
  }
}

// Send email action
async function executeSendEmail(
  action: AutomationAction,
  eventData: EventData,
  rule: AutomationRule
): Promise<boolean> {
  try {
    console.log(`[Automation] Executing email action for rule: ${rule.name}`);
    
    const recipientEmail = eventData.lead?.email || eventData.user?.email;
    
    if (!recipientEmail) {
      console.warn('[Automation] No recipient email found for rule:', rule.name);
      return false;
    }

    // Build email content from action value (template)
    let subject = `Automation: ${rule.name}`;
    let body = action.value || 'This is an automated message from QuoteCraft Pro.';

    // Simple template replacements
    body = body
      .replace(/\{lead\.company_name\}/g, eventData.lead?.company_name || '')
      .replace(/\{lead\.contact_name\}/g, eventData.lead?.contact_name || '')
      .replace(/\{deal\.value\}/g, eventData.deal?.deal_value?.toString() || '')
      .replace(/\{quotation\.number\}/g, eventData.quotation?.quote_number || '')
      .replace(/\{invoice\.number\}/g, eventData.invoice?.invoice_number || '');

    console.log(`[Automation] Sending email to: ${recipientEmail}, Subject: ${subject}`);

    const result = await sendEmail({
      to: recipientEmail,
      subject,
      body: `<div style="font-family: sans-serif; padding: 20px;">
        <h2>QuoteCraft Pro Notification</h2>
        <p>${body.replace(/\n/g, '<br>')}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated email triggered by: ${rule.name}</p>
      </div>`,
      fromName: 'QuoteCraft Pro',
    });

    if (result.success) {
      console.log(`[Automation] ✅ Email sent successfully for automation: ${rule.name}`);
    } else {
      console.error(`[Automation] Email failed for automation: ${rule.name}`, result);
    }

    return result.success;
  } catch (error) {
    console.error(`[Automation] Error executing email action:`, error);
    return false;
  }
}

// Create task action
async function executeCreateTask(
  action: AutomationAction,
  eventData: EventData,
  rule: AutomationRule
): Promise<boolean> {
  try {
    console.log(`[Automation] Executing create task action for rule: ${rule.name}`);
    
    const taskTitle = action.value || `Follow up: ${rule.name}`;
    
    // Calculate due date (3 days from now by default)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    const taskData = {
      title: taskTitle
        .replace(/\{lead\.company_name\}/g, eventData.lead?.company_name || '')
        .replace(/\{lead\.contact_name\}/g, eventData.lead?.contact_name || ''),
      description: `Auto-created by automation rule: ${rule.name}`,
      entity_type: eventData.lead ? 'lead' : eventData.deal ? 'deal' : null,
      entity_id: eventData.lead?.id || eventData.deal?.id || null,
      due_date: dueDate.toISOString().split('T')[0],
      priority: 'medium',
      status: 'pending',
    };

    console.log(`[Automation] Creating task:`, taskData);

    const { error, data } = await supabase.from('tasks').insert(taskData).select();

    if (error) {
      console.error('[Automation] Error creating task:', error);
      return false;
    }

    console.log(`[Automation] ✅ Task created successfully for automation: ${rule.name}`, data);
    return true;
  } catch (error) {
    console.error(`[Automation] Error executing create task action:`, error);
    return false;
  }
}

// Send notification action
async function executeNotification(
  action: AutomationAction,
  eventData: EventData,
  rule: AutomationRule
): Promise<boolean> {
  try {
    console.log(`[Automation] Executing notification action for rule: ${rule.name}`);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[Automation] No user found for notification');
      return false;
    }
    
    const message = action.value || `Automation triggered: ${rule.name}`;
    
    // Create notification in database
    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      title: rule.name,
      message: message
        .replace(/\{lead\.company_name\}/g, eventData.lead?.company_name || '')
        .replace(/\{lead\.contact_name\}/g, eventData.lead?.contact_name || '')
        .replace(/\{deal\.value\}/g, eventData.deal?.deal_value?.toString() || '')
        .replace(/\{quotation\.number\}/g, eventData.quotation?.quote_number || '')
        .replace(/\{invoice\.number\}/g, eventData.invoice?.invoice_number || ''),
      type: 'info',
      category: 'automation',
      entity_type: eventData.lead ? 'lead' : eventData.deal ? 'deal' : eventData.quotation ? 'quotation' : eventData.invoice ? 'invoice' : null,
      entity_id: eventData.lead?.id || eventData.deal?.id || eventData.quotation?.id || eventData.invoice?.id || null,
      is_read: false,
    });

    if (error) {
      console.error('[Automation] Error creating notification in DB:', error);
    }

    // Also show a toast notification (client-side)
    const finalMessage = message
      .replace(/\{lead\.company_name\}/g, eventData.lead?.company_name || '')
      .replace(/\{lead\.contact_name\}/g, eventData.lead?.contact_name || '')
      .replace(/\{deal\.value\}/g, eventData.deal?.deal_value?.toString() || '')
      .replace(/\{quotation\.number\}/g, eventData.quotation?.quote_number || '')
      .replace(/\{invoice\.number\}/g, eventData.invoice?.invoice_number || '');
    
    toast.info(`🤖 ${rule.name}`, {
      description: finalMessage,
      duration: 5000,
    });

    console.log(`[Automation] ✅ Notification sent for automation: ${rule.name}`);
    return true;
  } catch (error) {
    console.error(`[Automation] Error executing notification:`, error);
    return false;
  }
}

// Update status action (for leads/deals)
async function executeUpdateStatus(
  action: AutomationAction,
  eventData: EventData,
  rule: AutomationRule
): Promise<boolean> {
  const newStatus = action.value;
  
  if (!newStatus) {
    console.warn('No status value provided for update_status action');
    return false;
  }

  if (eventData.lead) {
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', eventData.lead.id);

    if (error) {
      console.error('Error updating lead status:', error);
      return false;
    }
  } else if (eventData.deal) {
    const { error } = await supabase
      .from('deals')
      .update({ stage: newStatus })
      .eq('id', eventData.deal.id);

    if (error) {
      console.error('Error updating deal stage:', error);
      return false;
    }
  }

  console.log(`✅ Status updated for automation: ${rule.name}`);
  return true;
}

// Update rule execution count
async function updateRuleExecution(ruleId: string): Promise<void> {
  try {
    // First get current count
    const { data } = await supabase
      .from('automation_rules')
      .select('execution_count')
      .eq('id', ruleId)
      .single();

    const currentCount = data?.execution_count || 0;

    await supabase
      .from('automation_rules')
      .update({
        execution_count: currentCount + 1,
        last_executed_at: new Date().toISOString(),
      })
      .eq('id', ruleId);
  } catch (error) {
    console.error('Error updating rule execution count:', error);
  }
}

// Main function to handle automation events
export async function handleAutomationEvent(
  eventType: AutomationEvent,
  entityType: string,
  entityId: string,
  data: EventData
): Promise<void> {
  console.log(`\n🤖 [Automation] Event triggered: ${eventType}`);
  console.log(`   Entity: ${entityType}/${entityId}`);
  console.log(`   Data:`, data);

  try {
    // Get matching rules
    const rules = await getMatchingRules(eventType as AutomationEvent);
    
    if (rules.length === 0) {
      console.log(`[Automation] ⚠️ No active automation rules found for event: ${eventType}`);
      return;
    }

    console.log(`[Automation] 📋 Found ${rules.length} active rule(s) for: ${eventType}`);

    // Execute each matching rule
    for (const rule of rules) {
      console.log(`[Automation] ▶️  Executing rule: "${rule.name}"`);
      console.log(`   Action Type: ${(rule.actions as any)?.type || 'unknown'}`);
      
      const action = rule.actions as AutomationAction;
      const success = await executeAction(action, data, rule);
      
      if (success) {
        await updateRuleExecution(rule.id);
        console.log(`[Automation] ✅ Rule execution tracked`);
      } else {
        console.log(`[Automation] ❌ Rule execution failed`);
      }
    }
    
    console.log(`[Automation] 🏁 Automation processing complete for event: ${eventType}\n`);
  } catch (error) {
    console.error(`[Automation] 💥 Error in handleAutomationEvent:`, error);
  }
}

// Helper function to trigger automation from hooks
export async function triggerAutomation(
  eventType: AutomationEvent,
  data: EventData
): Promise<void> {
  const entityType = data.lead ? 'lead' : data.deal ? 'deal' : data.quotation ? 'quotation' : 'unknown';
  const entityId = data.lead?.id || data.deal?.id || data.quotation?.id || '';
  
  await handleAutomationEvent(eventType, entityType, entityId, data);
}
