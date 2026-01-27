# Automation Debugging Guide - Complete Walkthrough

## What Was Wrong (Analysis)

After deep code investigation, I found several issues that prevented automations from working:

1. **Notification Logic Had Backward Conditional**
   - The code was checking `if (!userId)` then fetching the user
   - This logic was convoluted and error-prone
   - **Fixed**: Simplified to always fetch current user and create notification

2. **Insufficient Logging**
   - No detailed logging to trace execution flow
   - Hard to identify where failures occurred
   - **Fixed**: Added comprehensive `[Automation]`, `[Hook]`, and `[Workflow]` prefixed logs

3. **No Testing Interface**
   - Users had to create real leads to test automations
   - Difficult to debug individual events
   - **Fixed**: Created dedicated `AutomationDiagnostics` page for testing

## How Automations Should Work - Detailed Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User Action: Create Lead                                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Leads Hook           │
        │ onSuccess Handler    │
        │ (NOW ASYNC!)         │
        └──────┬───────────────┘
               │
               ├─► Log: "[Hook] Lead created..."
               │
               ├─► Invalidate Queries
               │
               ├─► Toast: "Lead created successfully"
               │
               │   ┌─────────────────────────────────────┐
               │   │ Trigger Automations (WITH AWAIT)    │
               │   ├─────────────────────────────────────┤
               │   │ triggerAutomation('lead_created', { │
               │   │   lead: { ...leadData }             │
               │   │ })                                  │
               │   └────────┬────────────────────────────┘
               │            │
               │            ├─► [Automation] Event triggered
               │            │
               │            ├─► [Automation] Fetching rules
               │            │    Query: SELECT * FROM automation_rules
               │            │    WHERE trigger_event = 'lead_created'
               │            │    AND is_active = true
               │            │
               │            ├─► [Automation] Found N rule(s)
               │            │
               │            ├─► For Each Rule:
               │            │   ├─► [Automation] Executing rule: "Rule Name"
               │            │   ├─► [Automation] Action type: send_notification
               │            │   │
               │            │   └─► Execute Action
               │            │       ├─► Get current user from Auth
               │            │       ├─► Create notification in DB
               │            │       ├─► Show toast notification
               │            │       └─► [Automation] ✅ Notification sent
               │            │
               │            └─► [Automation] 🏁 Complete
               │
               │   ┌─────────────────────────────────────┐
               │   │ Trigger Workflows (WITH AWAIT)      │
               │   ├─────────────────────────────────────┤
               │   │ triggerWorkflows('lead_created',... │
               │   │ )                                   │
               │   └────────┬────────────────────────────┘
               │            │
               │            └─► Similar process as automations
               │
               └─► Continue with next React component logic


▼ RESULT:
✅ Lead created and displayed
✅ Automation rules executed
✅ Notifications/emails sent
✅ Tasks/workflows created
```

## Complete Code Path Trace

### 1. Hook Execution (useLeads.ts)

```typescript
// Step 1: User creates lead
const { mutate: createLead } = useCreateLead();
createLead(leadData);

// Step 2: Database insert completes
→ mutationFn executes
→ INSERT INTO leads VALUES (...)
→ RETURN created lead

// Step 3: onSuccess callback fires (NOW ASYNC!)
onSuccess: async (data) => {
  console.log('[Hook] useCreateLead onSuccess - Lead created:', data.id);
  // ✅ This is async now!
  
  await triggerAutomation('lead_created', { lead: leadData });
  // ✅ With await!
  
  await triggerWorkflows('lead_created', 'lead', data.id, leadData);
  // ✅ With await!
}
```

### 2. Automation Trigger (automationEngine.ts)

```typescript
// Step 4: triggerAutomation called
export async function triggerAutomation(
  eventType: AutomationEvent,
  data: EventData
): Promise<void> {
  await handleAutomationEvent(eventType, entityType, entityId, data);
}

// Step 5: handleAutomationEvent executes
export async function handleAutomationEvent(...) {
  console.log(`🤖 [Automation] Event triggered: ${eventType}`);
  
  // Step 6: Query database for matching rules
  const rules = await getMatchingRules(eventType);
  console.log(`[Automation] Found ${rules.length} active rule(s)`);
  
  // Step 7: Execute each matching rule
  for (const rule of rules) {
    console.log(`[Automation] Executing rule: "${rule.name}"`);
    
    // Step 8: Execute the action (send_email, create_task, send_notification, etc)
    const success = await executeAction(action, data, rule);
    
    // Step 9: Update rule execution tracking
    if (success) {
      await updateRuleExecution(rule.id);
    }
  }
}

// Step 10: Action-specific execution
async function executeNotification(...) {
  // Step 11: Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Step 12: Create notification in database
  await supabase.from('notifications').insert({
    user_id: user.id,
    title: rule.name,
    message: action.value, // Template string with replacements
    ...
  });
  
  // Step 13: Show toast to user
  toast.info(`🤖 ${rule.name}`, {
    description: message,
  });
  
  console.log(`[Automation] ✅ Notification sent`);
  return true;
}
```

## Expected Console Output

When you create a lead, the console should show:

```
[Hook] useCreateLead onSuccess - Lead created: 123e4567-e89b-12d3-a456-426614174000
[Hook] Triggering automations and workflows for lead_created...

============================================================
TEST: lead_created
============================================================

[Hook] ✅ Automations triggered

[Automation] Event triggered: lead_created
   Entity: lead/123e4567-e89b-12d3-a456-426614174000
   Data: { lead: { id: "...", company_name: "...", ... } }

[Automation] Fetching rules for event: lead_created
[Automation] Found 1 active rule(s) for lead_created:
   [
     {
       id: "...",
       name: "Welcome Email",
       trigger_event: "lead_created",
       actions: { type: "send_notification", value: "Welcome {lead.contact_name}!" },
       is_active: true
     }
   ]

[Automation] 📋 Found 1 active rule(s) for: lead_created
[Automation] ▶️  Executing rule: "Welcome Email"
   Action Type: send_notification

[Automation] Executing notification action for rule: Welcome Email

[Automation] ✅ Notification sent for automation: Welcome Email

[Automation] ✅ Rule execution tracked

[Automation] 🏁 Automation processing complete for event: lead_created

[Hook] ✅ Workflows triggered

============================================================
```

## How to Debug Issues

### Issue 1: "No active automation rules found"

**Diagnosis**:
```
[Automation] ⚠️ No active automation rules for event: lead_created
```

**Solutions**:
1. Go to Settings → Automations
2. Check if any rules exist for that event
3. Verify the rule's "Active" toggle is ON
4. Check the trigger event name matches exactly
5. Look in database:
   ```sql
   SELECT * FROM automation_rules 
   WHERE trigger_event = 'lead_created' 
   AND is_active = true;
   ```

### Issue 2: "Rule not executing"

**Diagnosis**:
```
[Automation] ▶️  Executing rule: "My Rule"
[Automation] ❌ Rule execution failed
```

**Solutions**:
1. Check the action type is valid
2. For notifications: Verify user is authenticated
3. For emails: Check email address is valid
4. For tasks: Verify required fields are set
5. Check browser console for detailed error messages

### Issue 3: "User not found"

**Diagnosis**:
```
[Automation] No user found for notification
```

**Solutions**:
1. Ensure you're logged in
2. Check authentication session is valid
3. Verify user has necessary permissions

### Issue 4: "Database error"

**Diagnosis**:
```
[Automation] Error creating notification in DB: { code: "...", message: "..." }
```

**Solutions**:
1. Check the notifications table exists
2. Verify RLS policies allow INSERT
3. Check all required columns are provided
4. Look at the specific error message for details

## Using the Diagnostics Page

### Quick Test (2 minutes)

1. Navigate to: **Settings → Automations → Diagnostics**
2. Modify test data if needed:
   - Contact Name: "Your Name"
   - Company Name: "Your Company"
   - Email: "your@email.com"
3. Click **Lead Created** button
4. Check Console (F12) for logs
5. Check Results panel for success/error

### What Happens When You Click a Button

```
1. Diagnostics page calls: testAutomation('lead_created')
2. Creates test data: { lead: { id, company_name, contact_name, email } }
3. Calls: triggerAutomation('lead_created', testData)
4. Automation engine processes the event
5. Results displayed in page + console
6. Toast notifications appear
```

### Console Log Tracking

Watch these prefixes in console:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `[Hook]` | Hook is executing | `[Hook] useCreateLead onSuccess` |
| `[Automation]` | Automation engine | `[Automation] Event triggered` |
| `[Workflow]` | Workflow engine | `[Workflow] Processing` |
| `[Automation] ✅` | Success | `[Automation] ✅ Notification sent` |
| `[Automation] ❌` | Error | `[Automation] ❌ Rule failed` |
| `[Automation] ⚠️` | Warning | `[Automation] ⚠️ No rules found` |
| `🤖` | Automation event | `🤖 [Automation] Event triggered` |

## Testing Checklist

- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Navigate to Automations Settings
- [ ] Create a test automation rule
- [ ] Go to Diagnostics page
- [ ] Click a test button
- [ ] Watch console for `[Automation]` logs
- [ ] Verify results panel shows success
- [ ] Look for notification/toast message
- [ ] Check database for created items

## Database Query to Verify Everything

```sql
-- Check if automations exist
SELECT id, name, trigger_event, is_active, execution_count
FROM automation_rules
WHERE trigger_event = 'lead_created';

-- Check last executions
SELECT *
FROM automation_rule_executions
ORDER BY created_at DESC
LIMIT 10;

-- Check notifications created
SELECT *
FROM notifications
WHERE category = 'automation'
ORDER BY created_at DESC
LIMIT 10;
```

## Key Files for Reference

- **Automation Engine**: `src/lib/automationEngine.ts` - Core execution logic
- **Hooks**: `src/hooks/useLeads.ts`, `useDeals.ts`, etc. - Where triggers happen
- **Settings**: `src/pages/AutomationSettings.tsx` - UI for creating rules
- **Diagnostics**: `src/pages/AutomationDiagnostics.tsx` - Testing interface
- **App Routes**: `src/App.tsx` - Route definitions

## Summary

Automations now have:
- ✅ Proper async/await execution
- ✅ Detailed console logging
- ✅ Diagnostics testing page
- ✅ Better error handling
- ✅ Complete execution tracking

To test: Go to **Settings → Automations → Diagnostics** and click any test button!
