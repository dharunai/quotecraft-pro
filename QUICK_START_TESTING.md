# Quick Start Guide - Testing Automations & Workflows

## 5-Minute POC Test

### Step 1: Create an Automation Rule (2 minutes)
1. Login to QuoteCraft Pro
2. Go to **Settings → Automations**
3. Click **+ New Automation**
4. Fill in:
   - **Name**: "Test Welcome Email"
   - **Trigger Event**: "Lead Created"
   - **Action Type**: "Send Notification"
   - **Message**: "Welcome {lead.contact_name}! We received your inquiry about {lead.company_name}"
5. Toggle **Active** to ON
6. Click **Save**

**Expected**: Automation rule appears in the list

---

### Step 2: Test the Automation (3 minutes)
1. Go to **Leads → Create New Lead**
2. Fill in:
   - **Company Name**: "Test Corp"
   - **Contact Name**: "John Doe"
   - **Email**: "john@testcorp.com"
   - **Industry**: "Technology"
3. Click **Create Lead**

**Expected Results**:
- ✅ Lead is created successfully
- ✅ Toast shows "Lead created successfully"
- ✅ Toast shows "🤖 Welcome John Doe! We received your inquiry about Test Corp"
- ✅ Open browser Console (F12) and see logs:
  ```
  🤖 Automation event: lead_created
  Found 1 automation rule(s) for: lead_created
  Executing rule: Test Welcome Email
  ✅ Notification sent for automation: Test Welcome Email
  ```

---

## Advanced Test: Create a Workflow

### Step 1: Create a Simple Workflow (5 minutes)
1. Go to **Workflows → Workflow Builder**
2. Click **Create New Workflow**
3. Fill in:
   - **Name**: "New Deal Process"
   - **Trigger**: Select "Deal Created"
4. In the canvas:
   - Click and drag nodes to build flow:
     1. Trigger node (pre-set)
     2. Add "Send Notification" action
        - Message: "New deal created! Value: {deal.value}"
     3. Add "Create Task" action
        - Title: "Follow up on {lead.company_name} deal"
        - Due Date: 3 days
5. Click **Save**
6. Toggle **Active** to ON

**Expected**: Workflow appears in workflows list

### Step 2: Test the Workflow
1. Go to **Leads**
2. Open any lead with status "Interested"
3. Click **Create Deal** button
4. Fill in deal details and click **Create Deal**

**Expected Results**:
- ✅ Deal is created
- ✅ Notification appears: "New deal created!"
- ✅ Task is created for the deal
- ✅ Browser console shows workflow execution logs

---

## What's Working Now (Fixed)

### ✅ Automations
- Automations trigger on all business events
- All action types work: Email, Task, Notification, Status Update
- Execution count is tracked
- Last execution timestamp is saved

### ✅ Workflows  
- Workflows trigger on business events (previously not working)
- Visual workflow definitions execute properly
- Nodes execute in correct order
- Data flows between nodes correctly

### ✅ Events Triggering Both
The following events now trigger both automations AND workflows:
- Lead Created
- Lead Qualified
- Deal Created
- Deal Won
- Deal Lost
- Quotation Sent
- Quotation Accepted
- Quotation Rejected
- Invoice Created
- Invoice Paid
- Task Completed

---

## Monitoring & Debugging

### View Execution Logs
1. Open browser DevTools: **F12 → Console**
2. Look for messages starting with:
   - `🤖 Automation event:` - Automation triggered
   - `Triggering workflow:` - Workflow triggered
   - `✅ Email sent` - Email action executed
   - `Executing rule:` - Rule being executed

### View Database Records
Use the database explorer or SQL:
```sql
-- Check active automations
SELECT id, name, trigger_event, execution_count, last_executed_at 
FROM automation_rules 
WHERE is_active = true 
ORDER BY last_executed_at DESC;

-- Check active workflows
SELECT id, name, trigger_type, trigger_config, is_active 
FROM workflow_definitions 
WHERE is_active = true;

-- Check workflow executions
SELECT id, workflow_id, status, started_at, completed_at 
FROM workflow_executions 
ORDER BY started_at DESC LIMIT 10;
```

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Automation not triggering | Check if rule is **Active** in settings |
| Workflow not executing | Verify workflow **Active** toggle is ON |
| Email not sending | Check if backend email service is running |
| Task not creating | Verify you have permission to create tasks |
| No console logs | Open DevTools (F12) and check Console tab |

---

## Key Files Modified

Files that now have workflow integration:
- ✅ `src/hooks/useLeads.ts` - Triggers on lead create/qualify
- ✅ `src/hooks/useDeals.ts` - Triggers on deal create/won/lost
- ✅ `src/hooks/useQuotations.ts` - Triggers on status change
- ✅ `src/hooks/useInvoices.ts` - Triggers on create/paid
- ✅ `src/hooks/useTasks.ts` - Triggers on complete
- ✅ `src/pages/LeadDetail.tsx` - Triggers on qualification

All callbacks are now **async** and **await** the trigger functions properly.

---

## Next Steps

1. **Create Test Automations**: Set up 2-3 simple automations for your workflow
2. **Test Edge Cases**: Try creating leads/deals with different values
3. **Monitor Execution**: Watch console logs and check execution counts
4. **Build Workflows**: Create visual workflows for complex business processes
5. **Set Up Notifications**: Configure who should be notified for each event

---

## Support

For detailed documentation, see: [AUTOMATION_WORKFLOW_POC.md](./AUTOMATION_WORKFLOW_POC.md)
