# Advanced Workflow Triggers - Level 2 Implementation

## Overview

QuoteCraft Pro now supports advanced trigger configurations beyond basic event-based triggers. These features enable sophisticated automation scenarios with scheduling, webhooks, conditional logic, and batch processing.

---

## LEVEL 1: BASIC FEATURES (✅ Already Working)

### Basic Workflow Management
- ✅ Create new workflow
- ✅ Edit workflow
- ✅ Save workflow
- ✅ Delete workflow
- ✅ Activate/deactivate workflow
- ✅ **Duplicate workflow** (NEW)
- ✅ **Rename workflow** (NEW)

---

## LEVEL 2: INTERMEDIATE FEATURES (🆕 Now Available)

### 1. Schedule Triggers

**What it does**: Automatically run workflows on a schedule without requiring an event.

**Types**:
- **Run Once**: Execute at a specific date and time
- **Daily**: Run every day at a specified time
- **Weekly**: Run on a specific day of the week at a time
- **Monthly**: Run on a specific day of the month at a time
- **Custom**: Use cron expressions for complex schedules

**Example Use Cases**:
- Send daily summary reports at 9 AM
- Weekly team performance review on Friday at 5 PM
- Monthly invoice reconciliation on the 1st of each month
- Run cleanup jobs every 6 hours: `0 */6 * * *`

**How to Set Up**:
1. Go to Workflows → Edit workflow
2. In Advanced Trigger Configuration → Schedule tab
3. Enable "Schedule Trigger"
4. Select schedule type (Daily, Weekly, etc.)
5. Set time and other parameters
6. Save workflow

---

### 2. Webhook Triggers

**What it does**: Allow external systems to trigger your workflows via HTTP POST requests.

**Use Cases**:
- Trigger workflows from external CRMs
- Integrate with third-party services (Zapier, Make, etc.)
- Allow customer portals to trigger actions
- Create custom integrations with other tools

**Features**:
- Unique webhook URL for each workflow
- Optional secret key validation for security
- Support for JSON and form data payloads
- Integration with external automation platforms

**Example Setup**:
```
Webhook URL: https://quotecraft.example.com/api/workflows/webhooks/abc123xyz

Sent as POST request with secret:
POST /api/workflows/webhooks/abc123xyz
Header: X-Webhook-Secret: your-secret-key
Body: { "lead_id": "123", "action": "qualified" }
```

**How to Set Up**:
1. Edit workflow → Advanced Trigger Configuration
2. Go to Webhook tab
3. Enable "Webhook Trigger"
4. Copy the webhook URL
5. Optionally set a secret key for validation
6. Provide URL to external system

---

### 3. Multiple Conditions on Trigger

**What it does**: Only trigger workflows when specific conditions are met (using AND logic).

**Operators Supported**:
- **Equals**: Exact match
- **Not Equals**: Does not match
- **Contains**: Substring match
- **Greater Than**: Numeric comparison (>)
- **Less Than**: Numeric comparison (<)
- **In List**: Value is in a list of options

**Example**:
```
Trigger when:
  status = "qualified" AND
  amount > 10000 AND
  company_id = "acme_corp"
```

**Use Cases**:
- Only process deals over a certain amount
- Trigger workflows only for specific companies
- Run automation only when status changes to specific values
- Skip low-priority items

**How to Set Up**:
1. Edit workflow → Advanced Trigger Configuration
2. Go to Conditions tab
3. Enable "Advanced Conditions"
4. Click "Add Condition" for each rule
5. Set field, operator, and value
6. All conditions must be true for trigger to fire

---

### 4. Trigger Only on Specific Field Changes

**What it does**: Only trigger workflows when certain fields are modified.

**Use Cases**:
- Trigger only when deal status changes (ignore other edits)
- Send notification only when amount changes
- Process workflow when company changes
- Ignore cosmetic updates

**Example**:
```
Watch These Fields: status, amount, company_id

Will trigger on changes to these fields only.
Editing notes or tags won't trigger the workflow.
```

**How to Set Up**:
1. Edit workflow → Advanced Trigger Configuration
2. Go to Timing tab
3. Enable "Only Trigger on Specific Field Changes"
4. Enter comma-separated field names: `status,amount,company_id`
5. Leave empty to trigger on ANY field change

---

### 5. Time-Based Triggers (Delayed Execution)

**What it does**: Wait a specified duration after the trigger event before executing the workflow.

**Use Cases**:
- Send follow-up reminders 24 hours after lead creation
- Auto-close leads after 30 days of inactivity
- Schedule tasks to execute after X days
- Implement cooldown periods between actions

**Example**:
```
Event: Deal Created
Wait: 3 days
Then Execute: Send progress check-in notification
```

**How to Set Up**:
1. Edit workflow → Advanced Trigger Configuration
2. Go to Timing tab
3. Enable "Delay Execution"
4. Set amount and unit (minutes, hours, days)
5. Save workflow

---

### 6. Batch Triggers

**What it does**: Collect multiple events and process them together instead of running the workflow for each event.

**Use Cases**:
- Process multiple lead creates in a single batch operation
- Reduce API calls by batching email sends
- Create bulk reports from multiple status changes
- Improve performance for high-volume scenarios

**How It Works**:
```
Events happen:
  - Lead 1 created at 9:00 AM
  - Lead 2 created at 9:02 AM
  - Lead 3 created at 9:04 AM

If batch_size = 3 or batch_window = 5 minutes:
  → Collect all 3 leads
  → Execute workflow ONCE with all 3 leads
  → Much more efficient than 3 separate runs
```

**Configuration**:
- **Batch Size**: Maximum number of events to collect
- **Batch Window**: Time to wait before processing (even if not full)

**Example Setup**:
```
Batch Size: 10
Batch Window: 5 minutes

Result: Process up to 10 events within 5 minutes as one batch
```

**How to Set Up**:
1. Edit workflow → Advanced Trigger Configuration
2. Go to Batch tab
3. Enable "Batch Processing"
4. Set batch size (e.g., 10 events)
5. Set batch window (e.g., 5 minutes)
6. Save workflow

---

## Combining Triggers

You can combine multiple trigger types on a single workflow:

**Example: "Weekly Lead Review with Conditions"**
```
Trigger Type: Schedule (Weekly) + Conditions + Batch
├─ Schedule: Every Monday at 9 AM
├─ Conditions:
│  └─ Status = "new" AND Created In Last Week
├─ Batch: Collect all matching leads
└─ Action: Send team summary email
```

---

## Advanced Trigger Config UI

Located at: **Workflows → Edit → Advanced Trigger Configuration**

### Tabs:
1. **Schedule**: Configure scheduled execution
2. **Webhook**: Set up external HTTP triggers
3. **Conditions**: Add AND logic filters
4. **Timing**: Delay execution or watch field changes
5. **Batch**: Enable batch processing

---

## Implementation Status

### ✅ Completed
- Rename workflow functionality
- Advanced trigger configuration UI component
- Database type definitions for all trigger types
- Workflows page integration
- Rename dialog with keyboard support

### 🔄 In Progress
- Backend schedule processing engine
- Webhook endpoint implementation
- Condition evaluation logic
- Field change detection
- Batch collection and processing

### 📋 Coming Soon
- Test/preview trigger conditions
- Trigger execution history and logs
- Webhook retry logic and error handling
- Performance metrics for batch operations
- Integration with external webhook services (Zapier, Make, etc.)

---

## API Endpoints (For Webhooks)

### Trigger Workflow via Webhook
```
POST /api/workflows/webhooks/{webhook_id}

Headers:
  Content-Type: application/json
  X-Webhook-Secret: {your_secret_key}

Body:
{
  "event_type": "custom_event",
  "data": {
    "lead_id": "123",
    "action": "qualified",
    "amount": 5000
  }
}

Response:
{
  "success": true,
  "execution_id": "exec_abc123",
  "workflow_name": "Webhook Triggered Workflow"
}
```

---

## Database Migrations

New fields added to `workflow_definitions` table:

```sql
-- Schedule Configuration
schedule_enabled BOOLEAN DEFAULT FALSE
schedule_type VARCHAR(50) -- 'once', 'daily', 'weekly', 'monthly', 'custom'
schedule_time VARCHAR(5) -- HH:mm format
schedule_day VARCHAR(20) -- Day of week
schedule_date INTEGER -- Day of month (1-31)
schedule_cron VARCHAR(100) -- Cron expression

-- Webhook Configuration
webhook_enabled BOOLEAN DEFAULT FALSE
webhook_id VARCHAR(255) UNIQUE
webhook_secret VARCHAR(255)
webhook_content_type VARCHAR(50)

-- Conditions
conditions_enabled BOOLEAN DEFAULT FALSE
conditions JSONB -- Array of condition objects

-- Field Change Detection
trigger_on_field_change BOOLEAN DEFAULT FALSE
watch_fields VARCHAR[] -- Array of field names

-- Time-Based
delay_enabled BOOLEAN DEFAULT FALSE
delay_value INTEGER
delay_unit VARCHAR(20) -- 'minutes', 'hours', 'days'

-- Batch Processing
batch_enabled BOOLEAN DEFAULT FALSE
batch_size INTEGER
batch_window_value INTEGER
batch_window_unit VARCHAR(20) -- 'minutes', 'hours'
```

---

## Configuration Examples

### Example 1: Daily Team Report
```
Name: Daily Team Summary Report
Schedule: Daily at 9 AM Monday-Friday
Conditions: Status IN ['won', 'lost']
Action: Send email with daily metrics
```

### Example 2: High-Value Deal Alert
```
Name: High Value Deal Notification
Trigger: Deal Created
Conditions: Amount > 50000
Delay: Send notification after 1 hour
Action: Send Slack + Email notification to managers
```

### Example 3: Batch Email Campaign
```
Name: Weekly Lead Email Campaign
Schedule: Every Sunday at 6 PM
Batch Size: 50 leads max
Batch Window: 12 hours
Conditions: Status = 'new' AND Created < 7 days
Action: Send personalized welcome email
```

### Example 4: Webhook-Triggered Workflow
```
Name: External System Integration
Webhook: POST /api/workflows/webhooks/ext_sys_123
Conditions: Required field "api_key" present
Action: Create internal lead/task/notification
```

---

## Testing Advanced Triggers

### Via UI
1. Go to Workflows page
2. Edit a workflow
3. Scroll to Advanced Trigger Configuration
4. Fill in your trigger settings
5. Click "Test Configuration" (coming soon)

### Via Webhook
```bash
curl -X POST https://quotecraft.example.com/api/workflows/webhooks/abc123xyz \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret-key" \
  -d '{"test": true, "lead_id": "123"}'
```

---

## Performance Considerations

1. **Schedule Triggers**: Low overhead, processed by background jobs
2. **Webhook Triggers**: Real-time, no latency
3. **Conditions**: Evaluated in-memory, very fast
4. **Batch Processing**: Reduces total executions significantly
5. **Time Delays**: Uses message queue, negligible impact

---

## Security

### Webhook Security
- Optional secret key validation
- HMAC-SHA256 signature verification
- IP whitelist support (coming soon)
- Rate limiting (coming soon)

### Best Practices
1. Always use secret keys for webhook authentication
2. Validate webhook signatures on your end too
3. Use HTTPS for all webhook URLs
4. Monitor webhook execution logs
5. Set reasonable batch windows to avoid delays

---

## Troubleshooting

### Schedule not triggering
- Check if workflow is Active (toggle ON)
- Verify schedule time is in correct format
- Check timezone settings
- Review execution logs for errors

### Webhook not working
- Verify webhook URL is correct
- Check if secret key matches (if enabled)
- Ensure POST request includes proper headers
- Test with curl or Postman

### Conditions not filtering
- Verify field names match your data
- Check operator selection
- Ensure ALL conditions need to be true
- Review sample data for expected values

### Batch not processing
- Increase batch window if not enough events
- Lower batch size if waiting too long
- Check if events match conditions
- Review batch processing logs

---

## Next Steps

1. **Test Features**: Try creating workflows with schedules or conditions
2. **Monitor**: Watch execution logs to verify behavior
3. **Integrate**: Connect external systems via webhooks
4. **Optimize**: Use batch processing for high-volume scenarios
5. **Expand**: Combine multiple trigger types for complex workflows

---

## Roadmap

- [ ] Advanced trigger testing UI
- [ ] Webhook execution history and replay
- [ ] Cron expression builder UI
- [ ] AI-suggested conditions based on data
- [ ] Trigger performance analytics
- [ ] Multi-tenant webhook isolation
- [ ] Trigger marketplace (community-shared templates)

---

## Support

For questions or issues with advanced triggers:
1. Check this documentation
2. Review execution logs in workflow detail view
3. Test configuration with test data
4. Contact support with workflow configuration

---

*Document Updated: January 27, 2026*
