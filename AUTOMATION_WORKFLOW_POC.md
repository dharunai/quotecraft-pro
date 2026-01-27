# Automation & Workflow Proof of Concept

## Overview

This document demonstrates the complete automation and workflow system in QuoteCraft Pro, including how they work together and how to test them.

## Architecture

### Automation Engine (`src/lib/automationEngine.ts`)
- **Purpose**: Executes simple, rule-based automation actions
- **Trigger**: Any business event (lead created, deal won, etc.)
- **Actions**: Send email, create task, send notification, update status

### Workflow Engine (`src/lib/workflowEngine.ts`)
- **Purpose**: Executes complex, visual workflow definitions
- **Trigger**: Same business events as automations
- **Capabilities**: Conditions, loops, delays, data transformations, and all automation actions

## Event Triggers

Both automations and workflows are triggered by the following events:

### Lead Events
- `lead_created` - When a new lead is added
- `lead_qualified` - When a lead is qualified/converted to a deal

### Deal Events
- `deal_created` - When a new deal is created from a lead
- `deal_won` - When a deal stage changes to 'won'
- `deal_lost` - When a deal stage changes to 'lost'

### Quotation Events
- `quotation_sent` - When quotation status changes to 'sent'
- `quotation_accepted` - When quotation status changes to 'accepted'
- `quotation_rejected` - When quotation status changes to 'rejected'

### Invoice Events
- `invoice_created` - When a new invoice is created
- `invoice_paid` - When invoice payment_status changes to 'paid'

### Task Events
- `task_completed` - When a task is marked as completed

## How Automations Work

### Trigger Flow

```
User Action (e.g., Create Lead)
    ↓
Database Update
    ↓
Hook onSuccess Callback
    ↓
triggerAutomation() called
    ↓
Get Matching Automation Rules (by trigger event)
    ↓
For Each Matching Rule:
  - Execute Action (send email, create task, etc.)
  - Update Rule Execution Count
    ↓
Result: Automation Action Completed
```

### Example: Lead Creation Automation

**Setup in AutomationSettings:**
1. Create new automation rule
   - Name: "Send welcome email to new leads"
   - Trigger Event: "Lead Created"
   - Action Type: "Send Email"
   - Action Value: "Welcome {lead.contact_name}, we received your inquiry..."

**Code Flow:**
```typescript
// In useLeads.ts - useCreateLead hook
const leadData = {
  id: data.id,
  company_name: data.company_name,
  contact_name: data.contact_name,
  email: data.email,
};

// Trigger automation
await triggerAutomation('lead_created', { lead: leadData });

// In automationEngine.ts
→ getMatchingRules('lead_created')
  - Query automation_rules table
  - Filter by trigger_event = 'lead_created' AND is_active = true
  
→ For each matching rule, executeAction()
  - Action type: 'send_email'
  - Recipient: eventData.lead.email
  - Subject: "Automation: Send welcome email to new leads"
  - Body: "Welcome John, we received your inquiry..."
  
→ updateRuleExecution()
  - Increment execution_count
  - Update last_executed_at timestamp
```

## How Workflows Work

### Trigger Flow

```
User Action (e.g., Create Lead)
    ↓
Database Update
    ↓
Hook onSuccess Callback
    ↓
triggerWorkflows() called
    ↓
Get Matching Workflow Definitions (by trigger event)
    ↓
For Each Matching Workflow:
  - Create Execution Record
  - Follow Node Graph (triggers → conditions → actions → loops)
  - Execute Each Node Type:
    * Action Nodes: Email, Task, Notification, Status Update
    * Condition Nodes: Branch execution based on conditions
    * Delay Nodes: Wait for specified duration
    * Loop Nodes: Iterate over arrays
    * Data Nodes: Transform/manipulate data
    ↓
Result: Workflow Execution Completed
```

### Example: Complex Lead Scoring Workflow

**Setup in WorkflowBuilder:**
1. Create workflow "Lead Scoring and Qualification"
   - Trigger: Lead Created
   - Flow:
     1. Check if lead.company_size >= 100 (Condition Node)
        - If YES: Set lead score to 100
        - If NO: Set lead score to 50
     2. Send notification "New lead: {lead.company_name}"
     3. Create task "Follow up with {lead.contact_name}"
     4. Wait 24 hours
     5. If lead not qualified: Send email "Are you still interested?"

**Code Flow:**
```typescript
// In useLeads.ts - useCreateLead hook
await triggerWorkflows('lead_created', 'lead', data.id, leadData);

// In workflowEngine.ts
→ triggerWorkflows('lead_created', 'lead', leadId, leadData)
  - Query workflow_definitions table
  - Filter by is_active = true AND trigger_event = 'lead_created'
  
→ For each matching workflow:
  - executeWorkflow(workflow, eventName, triggerData)
    
→ Execute workflow nodes in order:
  1. Condition Node:
     - Evaluate: lead.company_size >= 100
     - If true: Continue to node A (set score to 100)
     - If false: Continue to node B (set score to 50)
  
  2. Action Node (Send Notification):
     - sendNotification("New lead: ACME Corp")
  
  3. Action Node (Create Task):
     - createTask("Follow up with John Doe", "high", 3 days)
  
  4. Delay Node:
     - Wait 24 hours
  
  5. Condition Node (Check if qualified):
     - If not qualified: Continue to email action
  
  6. Action Node (Send Email):
     - sendEmail(lead.email, "Are you still interested?")

→ updateExecutionStatus()
  - Mark workflow execution as completed
  - Store execution steps and results
```

## Database Tables

### automation_rules
- `id`: UUID (Primary Key)
- `name`: string
- `trigger_event`: string (lead_created, deal_won, etc.)
- `trigger_conditions`: jsonb (optional conditions)
- `actions`: jsonb { type, value }
- `is_active`: boolean
- `execution_count`: integer
- `last_executed_at`: timestamp
- `created_by`: UUID (user who created)
- `created_at`, `updated_at`: timestamps

### workflow_definitions
- `id`: UUID (Primary Key)
- `name`: string
- `description`: string
- `flow_definition`: jsonb (nodes and edges)
- `trigger_type`: string ('event', 'schedule', 'manual')
- `trigger_config`: jsonb { event, schedule, etc. }
- `is_active`: boolean
- `created_by`: UUID
- `created_at`, `updated_at`: timestamps

### workflow_executions
- `id`: UUID (Primary Key)
- `workflow_id`: UUID (Foreign Key)
- `trigger_event`: string
- `trigger_data`: jsonb
- `status`: string ('running', 'completed', 'failed')
- `execution_steps`: jsonb (array of steps executed)
- `error`: string (if failed)
- `started_at`, `completed_at`: timestamps

## Testing the POC

### Manual Test: Automation for Lead Creation

1. **Navigate to**: Automations Settings page
2. **Create Automation Rule**:
   - Name: "Test Lead Automation"
   - Trigger Event: "Lead Created"
   - Action Type: "Send Notification"
   - Action Value: "New lead created: {lead.contact_name}"

3. **Create a New Lead**:
   - Go to Leads → Create New Lead
   - Fill in: Company Name, Contact Name, Email
   - Click "Create Lead"

4. **Expected Result**:
   - Toast notification appears: "✅ New lead created successfully"
   - Console log shows: "🤖 Automation event: lead_created"
   - Console log shows: "✅ Notification sent for automation: Test Lead Automation"
   - Notification appears in the system

### Manual Test: Workflow for Deal Won

1. **Navigate to**: Workflows → WorkflowBuilder
2. **Create Workflow**:
   - Name: "Deal Won Process"
   - Trigger: Deal Won event
   - Add Action: Send Email
     - To: Lead Email
     - Subject: "Congratulations on winning the deal!"
     - Body: "Deal value: {deal.value}"

3. **Trigger the Workflow**:
   - Go to Deals
   - Open any deal
   - Change stage to "Won"
   - Click "Save"

4. **Expected Result**:
   - Console shows workflow execution logs
   - Email is queued to send
   - Workflow execution record is created in database

### Manual Test: Check Execution History

1. **View Automation Executions**:
   - Go to Automation Settings
   - Each rule shows:
     - Execution Count: How many times it ran
     - Last Executed: When it last ran

2. **View Workflow Executions**:
   - Go to Workflows
   - Click on workflow
   - See "Execution History" tab
   - Each execution shows:
     - Status: completed/failed
     - Nodes executed
     - Results/errors

## Integration Points

### Hook Integration
All create/update mutations now trigger:
```typescript
// 1. Send toast notification
toast.success('Entity created successfully');

// 2. Trigger automations
await triggerAutomation(eventType, eventData);

// 3. Trigger workflows
await triggerWorkflows(eventType, entityType, entityId, eventData);

// 4. Invalidate queries for UI refresh
queryClient.invalidateQueries({ queryKey: ['entities'] });
```

### File Changes
- `src/hooks/useLeads.ts` - Added workflow triggers
- `src/hooks/useDeals.ts` - Added workflow triggers
- `src/hooks/useQuotations.ts` - Added workflow triggers
- `src/hooks/useInvoices.ts` - Added workflow triggers
- `src/hooks/useTasks.ts` - Added workflow triggers
- `src/pages/LeadDetail.tsx` - Added workflow trigger for qualification

## Troubleshooting

### Automation Not Triggering
1. Check if automation rule is **active** (is_active = true)
2. Verify trigger event name matches exactly
3. Check browser console for error messages
4. Verify user has permissions to trigger automation

### Workflow Not Executing
1. Check if workflow definition is **active** (is_active = true)
2. Verify trigger event matches workflow trigger_config
3. Check workflow node configuration
4. Look for errors in workflow_executions table

### Debugging
1. Open Browser DevTools → Console
2. Look for logs starting with:
   - `🤖 Automation event:`
   - `✅ Email sent for automation:`
   - `Triggering workflow:`
   - `Executing rule:`

3. Check database:
   ```sql
   -- Check automation rules
   SELECT * FROM automation_rules WHERE is_active = true;
   
   -- Check workflow definitions
   SELECT * FROM workflow_definitions WHERE is_active = true;
   
   -- Check workflow executions
   SELECT * FROM workflow_executions ORDER BY started_at DESC LIMIT 10;
   ```

## Future Enhancements

1. **Scheduled Workflows**: Run workflows on a schedule (daily, weekly)
2. **Conditional Automations**: Add conditions to automation rules
3. **Workflow Templates**: Pre-built workflows for common scenarios
4. **Error Handling**: Retry failed automations/workflows
5. **Webhook Integration**: Trigger external systems from workflows
6. **AI-Powered Actions**: Use AI to generate email templates, suggestions
7. **Multi-step Automations**: Allow multiple sequential actions in rules

## Summary

The automation and workflow system is now fully integrated:
- ✅ Automations trigger on business events
- ✅ Workflows execute complex visual definitions
- ✅ Both systems share the same event triggers
- ✅ Execution history is tracked
- ✅ Easy to test and debug

Both systems are async and properly awaited, ensuring actions complete before continuing.
