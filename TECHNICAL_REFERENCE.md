# Technical Reference - Automations & Workflows

## Code Changes Reference

### Pattern Used in All Hooks

```typescript
// BEFORE (Not working)
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['entities'] });
  toast.success('Success');
  triggerAutomation('event_name', data);  // ❌ No await
}

// AFTER (Working)
onSuccess: async (data) => {  // ← Now async
  queryClient.invalidateQueries({ queryKey: ['entities'] });
  toast.success('Success');
  
  // Prepare event data
  const eventData = { /* structured data */ };
  
  // Trigger automations with await
  await triggerAutomation('event_name', { entity: eventData });
  
  // Trigger workflows with await  
  await triggerWorkflows('event_name', 'entity', data.id, eventData);
}
```

## Integration Checklist

### Hooks That Were Modified

1. **useLeads.ts**
   ```typescript
   // Import added
   import { triggerWorkflows } from '@/lib/workflowEngine';
   
   // Two places modified:
   - useCreateLead() → onSuccess for lead_created
   - useUpdateLead() → onSuccess for lead_qualified
   ```

2. **useDeals.ts**
   ```typescript
   // Import added
   import { triggerWorkflows } from '@/lib/workflowEngine';
   
   // Two places modified:
   - useCreateDeal() → onSuccess for deal_created
   - useUpdateDeal() → onSuccess for deal_won, deal_lost
   ```

3. **useQuotations.ts**
   ```typescript
   // Import added
   import { triggerWorkflows } from '@/lib/workflowEngine';
   
   // One place modified:
   - useUpdateQuotation() → onSuccess for quotation_sent, _accepted, _rejected
   ```

4. **useInvoices.ts**
   ```typescript
   // Import added
   import { triggerWorkflows } from '@/lib/workflowEngine';
   
   // Two places modified:
   - useCreateInvoice() → onSuccess for invoice_created
   - useUpdateInvoice() → onSuccess for invoice_paid
   ```

5. **useTasks.ts**
   ```typescript
   // Import added
   import { triggerWorkflows } from '@/lib/workflowEngine';
   
   // One place modified:
   - useCompleteTask() → onSuccess for task_completed
   ```

6. **LeadDetail.tsx**
   ```typescript
   // Import added
   import { triggerWorkflows } from '@/lib/workflowEngine';
   
   // One place modified:
   - handleQualifyLead() → Deal creation onSuccess
   ```

## Event Data Structures

### Lead Created/Qualified
```typescript
const leadData = {
  id: string,
  company_name: string,
  contact_name: string,
  email?: string,
  phone?: string,
  is_qualified?: boolean,
  deal_value?: number
}

triggerAutomation('lead_created', { lead: leadData });
triggerWorkflows('lead_created', 'lead', leadId, leadData);
```

### Deal Created/Won/Lost
```typescript
const dealData = {
  id: string,
  deal_value?: number,
  stage: string,
  probability?: number
}

triggerAutomation('deal_created', { 
  deal: dealData,
  lead: leadData 
});
triggerWorkflows('deal_created', 'deal', dealId, dealData);
```

### Quotation Events
```typescript
const quotationData = {
  id: string,
  quote_number: string,
  total?: number,
  status: string
}

triggerAutomation('quotation_sent', { 
  quotation: quotationData,
  lead: leadData 
});
triggerWorkflows('quotation_sent', 'quotation', quotationId, quotationData);
```

### Invoice Created/Paid
```typescript
const invoiceData = {
  id: string,
  invoice_number: string,
  grand_total: number,
  payment_status: string
}

triggerAutomation('invoice_created', { 
  invoice: invoiceData,
  lead: leadData 
});
triggerWorkflows('invoice_created', 'invoice', invoiceId, invoiceData);
```

### Task Completed
```typescript
const taskData = {
  id: string,
  title: string,
  priority?: string,
  status: string
}

triggerAutomation('task_completed', { task: taskData });
triggerWorkflows('task_completed', 'task', taskId, taskData);
```

## Function Signatures

### Automation Trigger
```typescript
export async function triggerAutomation(
  eventType: AutomationEvent,
  data: EventData
): Promise<void>

// AutomationEvent types:
type AutomationEvent = 
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
  | 'task_completed'

// EventData
interface EventData {
  lead?: { id, company_name, contact_name, email, phone };
  deal?: { id, deal_value, stage };
  quotation?: { id, quote_number, total };
  invoice?: { id, invoice_number, grand_total };
  task?: { id, title };
  user?: { id, email, name };
}
```

### Workflow Trigger
```typescript
export async function triggerWorkflows(
  eventName: string,
  entityType: string,
  entityId: string,
  entityData: Record<string, any>
): Promise<void>

// Parameters:
// eventName: The event that triggered (e.g., 'lead_created')
// entityType: Type of entity (e.g., 'lead', 'deal')
// entityId: ID of the entity
// entityData: The entity data as object
```

## Database Query References

### Check Active Automations
```sql
SELECT 
  id, 
  name, 
  trigger_event, 
  is_active,
  execution_count,
  last_executed_at
FROM automation_rules
WHERE is_active = true
ORDER BY last_executed_at DESC;
```

### Check Automation Execution History
```sql
SELECT 
  ar.name,
  ar.trigger_event,
  ar.execution_count,
  ar.last_executed_at
FROM automation_rules ar
WHERE ar.execution_count > 0
ORDER BY ar.last_executed_at DESC
LIMIT 10;
```

### Check Active Workflows
```sql
SELECT 
  id,
  name,
  trigger_type,
  trigger_config->>'event' as trigger_event,
  is_active,
  created_at
FROM workflow_definitions
WHERE is_active = true;
```

### Check Workflow Executions
```sql
SELECT 
  wd.name,
  we.status,
  we.trigger_event,
  we.started_at,
  we.completed_at,
  (EXTRACT(EPOCH FROM we.completed_at - we.started_at))::int as duration_seconds
FROM workflow_executions we
JOIN workflow_definitions wd ON we.workflow_id = wd.id
ORDER BY we.started_at DESC
LIMIT 20;
```

### Get Failed Workflow Executions
```sql
SELECT 
  wd.name,
  we.status,
  we.error,
  we.started_at
FROM workflow_executions we
JOIN workflow_definitions wd ON we.workflow_id = wd.id
WHERE we.status = 'failed'
ORDER BY we.started_at DESC;
```

## Error Handling

### Automation Errors
```typescript
// Automations handle errors gracefully
try {
  const rules = await getMatchingRules(eventType);
  for (const rule of rules) {
    const action = rule.actions as AutomationAction;
    const success = await executeAction(action, data, rule);
    if (success) {
      await updateRuleExecution(rule.id);
    }
  }
} catch (error) {
  console.error('Error in handleAutomationEvent:', error);
  // Does NOT throw - prevents breaking main flow
}
```

### Workflow Errors
```typescript
// Workflows also handle errors gracefully
try {
  // Find and execute matching workflows
  const matchingWorkflows = workflows.filter(w => 
    w.trigger_config?.event === eventName
  );
  
  for (const workflow of matchingWorkflows) {
    await executeWorkflow(workflow, eventName, triggerData);
  }
} catch (error) {
  console.error('Error triggering workflows:', error);
  // Does NOT throw - prevents breaking main flow
}
```

## Console Debugging

### Expected Console Logs

When creating a lead with automation:
```
🤖 Automation event: lead_created
Found 1 automation rule(s) for: lead_created
Executing rule: Send welcome email
✅ Email sent for automation: Send welcome email
```

When triggering workflow:
```
Triggering workflow: New Lead Process for event: lead_created
Executing workflow: New Lead Process
Starting execution: <executionId>
Executing node: trigger_node
Executing node: send_notification_action
✅ Notification sent
Executing node: create_task_action
✅ Task created: Follow up with ACME Corp
Workflow execution completed
```

## Performance Considerations

### Async/Await Impact
- Automation triggers: ~100-500ms (API calls for emails, DB inserts)
- Workflow execution: ~200-1000ms (multiple nodes, conditions)
- Both are non-blocking (happens in background of React Query mutation)
- User sees instant toast notification before automation completes

### Database Impact
- Each automation execution: 1-3 database queries
- Each workflow execution: 2-5 database operations (+ actions)
- Execution records stored for audit trail
- Can be cleaned up after 30/90 days if needed

### Recommended Indexes
```sql
-- For faster automation lookups
CREATE INDEX idx_automation_rules_active_event 
ON automation_rules(trigger_event, is_active);

-- For workflow definition queries
CREATE INDEX idx_workflow_definitions_active_event 
ON workflow_definitions(is_active, trigger_type);

-- For execution history queries
CREATE INDEX idx_workflow_executions_status_date
ON workflow_executions(status, started_at DESC);
```

## Migration/Rollback

### To Disable Automations Temporarily
```sql
UPDATE automation_rules SET is_active = false;
-- All automations will stop executing
-- Workflows will continue (independent system)
```

### To Disable Workflows Temporarily
```sql
UPDATE workflow_definitions SET is_active = false;
-- All workflows will stop executing
-- Automations will continue (independent system)
```

### To Revert Code Changes
If you need to revert the changes:
1. Remove `triggerWorkflows` imports from all hooks
2. Remove all `await triggerWorkflows()` calls
3. Remove `async` from `onSuccess` callbacks
4. Remove `await` from `triggerAutomation()` calls (optional, won't break)

The system will continue to work with just automations.

## Testing Utilities

### Manual Test Helper
```typescript
// Add to browser console to trigger events manually
const testAutomation = async () => {
  const { triggerAutomation } = await import('@/lib/automationEngine');
  await triggerAutomation('lead_created', {
    lead: {
      id: 'test-id',
      company_name: 'Test Corp',
      contact_name: 'John Doe',
      email: 'john@test.com'
    }
  });
};

const testWorkflow = async () => {
  const { triggerWorkflows } = await import('@/lib/workflowEngine');
  await triggerWorkflows('lead_created', 'lead', 'test-id', {
    company_name: 'Test Corp',
    contact_name: 'John Doe'
  });
};
```

## API Integration

### Email Service
```typescript
// Called by automation email action
POST /api/send-email
{
  to: "email@example.com",
  subject: "Subject",
  htmlBody: "<html>...</html>",
  fromName: "QuoteCraft Pro"
}
```

### Notification Service
```typescript
// Called by automation notification action
// Stores in notifications table
{
  user_id: "user-uuid",
  title: "Notification Title",
  message: "Notification message",
  type: "info" | "success" | "warning" | "error",
  category: "automation" | "system" | "workflow"
}
```

## Summary

All automation and workflow integration is complete. The system:
- ✅ Triggers properly on all business events
- ✅ Executes with proper async/await
- ✅ Has error handling
- ✅ Tracks execution history
- ✅ Is production-ready

For more details, see the other documentation files:
- [AUTOMATION_WORKFLOW_POC.md](./AUTOMATION_WORKFLOW_POC.md) - Complete architecture
- [QUICK_START_TESTING.md](./QUICK_START_TESTING.md) - Testing guide
- [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md) - High-level summary
