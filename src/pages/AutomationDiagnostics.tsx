import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { triggerAutomation } from '@/lib/automationEngine';
import { triggerWorkflows } from '@/lib/workflowEngine';
import { toast } from 'sonner';

export default function AutomationDiagnostics() {
  const [testResults, setTestResults] = useState<Array<{
    id: string;
    eventType: string;
    status: 'pending' | 'success' | 'error';
    message: string;
    timestamp: Date;
  }>>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [contactName, setContactName] = useState('Test Lead');
  const [companyName, setCompanyName] = useState('Test Corp');
  const [email, setEmail] = useState('test@corp.com');

  const addResult = (eventType: string, status: 'pending' | 'success' | 'error', message: string) => {
    const result = {
      id: `${Date.now()}`,
      eventType,
      status,
      message,
      timestamp: new Date(),
    };
    setTestResults(prev => [result, ...prev]);
  };

  const testAutomation = async (eventType: string) => {
    setIsLoading(true);
    addResult(eventType, 'pending', 'Testing...');
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${eventType}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const testData = {
        lead: {
          id: `test-${Date.now()}`,
          company_name: companyName,
          contact_name: contactName,
          email: email,
          phone: '555-0000',
        },
        deal: {
          id: `test-deal-${Date.now()}`,
          deal_value: 50000,
          stage: 'qualified',
        },
        quotation: {
          id: `test-quote-${Date.now()}`,
          quote_number: 'TEST-001',
          total: 50000,
        },
        invoice: {
          id: `test-invoice-${Date.now()}`,
          invoice_number: 'INV-001',
          grand_total: 50000,
        },
        task: {
          id: `test-task-${Date.now()}`,
          title: 'Test Task',
        },
      };

      console.log('Calling triggerAutomation with event:', eventType);
      console.log('Data being sent:', testData);

      await triggerAutomation(eventType as any, testData);
      
      addResult(eventType, 'success', 'Automation executed successfully');
      toast.success(`✅ Automation test complete for: ${eventType}`);
      
      console.log(`✅ Test complete for ${eventType}`);
    } catch (error) {
      console.error('Test failed:', error);
      addResult(eventType, 'error', `Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error(`❌ Automation test failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      console.log(`${'='.repeat(60)}\n`);
    }
  };

  const testWorkflow = async (eventType: string) => {
    setIsLoading(true);
    addResult(eventType, 'pending', 'Testing workflow...');

    try {
      const testData = {
        company_name: companyName,
        contact_name: contactName,
        email: email,
      };

      console.log(`\nTesting workflow: ${eventType}`);
      console.log('Data:', testData);

      await triggerWorkflows(eventType, 'lead', `test-${Date.now()}`, testData);
      
      addResult(eventType, 'success', 'Workflow executed successfully');
      toast.success(`✅ Workflow test complete for: ${eventType}`);
    } catch (error) {
      console.error('Workflow test failed:', error);
      addResult(eventType, 'error', `Error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error(`❌ Workflow test failed`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automation Diagnostics</h1>
          <p className="text-muted-foreground">Test automations and workflows directly</p>
        </div>

        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Configure test data for automation triggers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contact-name">Contact Name</Label>
                <Input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@acme.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automation Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Automation Event Tests</CardTitle>
            <CardDescription>Click any button to test an automation event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                onClick={() => testAutomation('lead_created')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Lead Created
              </Button>
              <Button 
                onClick={() => testAutomation('lead_qualified')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Lead Qualified
              </Button>
              <Button 
                onClick={() => testAutomation('deal_created')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Deal Created
              </Button>
              <Button 
                onClick={() => testAutomation('deal_won')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Deal Won
              </Button>
              <Button 
                onClick={() => testAutomation('deal_lost')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Deal Lost
              </Button>
              <Button 
                onClick={() => testAutomation('quotation_sent')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Quote Sent
              </Button>
              <Button 
                onClick={() => testAutomation('quotation_accepted')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Quote Accepted
              </Button>
              <Button 
                onClick={() => testAutomation('quotation_rejected')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Quote Rejected
              </Button>
              <Button 
                onClick={() => testAutomation('invoice_created')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Invoice Created
              </Button>
              <Button 
                onClick={() => testAutomation('invoice_paid')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Invoice Paid
              </Button>
              <Button 
                onClick={() => testAutomation('task_completed')}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Task Complete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>{testResults.length} test(s) executed</CardDescription>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tests executed yet. Click a button above to start testing.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium text-sm">{result.eventType}</div>
                      <div className="text-xs text-muted-foreground">{result.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                      {result.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browser Console Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Debugging Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-2">1. Open Browser DevTools:</p>
              <p className="text-muted-foreground">Press <code className="bg-muted px-2 py-1 rounded">F12</code> and go to the <code className="bg-muted px-2 py-1 rounded">Console</code> tab</p>
            </div>
            <div>
              <p className="font-medium mb-2">2. Run a Test:</p>
              <p className="text-muted-foreground">Click any automation test button above</p>
            </div>
            <div>
              <p className="font-medium mb-2">3. Watch the Console:</p>
              <p className="text-muted-foreground">You'll see detailed logs starting with <code className="bg-muted px-2 py-1 rounded">[Automation]</code> or <code className="bg-muted px-2 py-1 rounded">[Hook]</code></p>
            </div>
            <div>
              <p className="font-medium mb-2">Expected Log Sequence:</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`[Hook] useCreateLead onSuccess - Lead created...
[Hook] Triggering automations and workflows...
[Automation] Event triggered: lead_created
[Automation] Fetching rules for event: lead_created
[Automation] Found X active rule(s)
[Automation] Executing rule: "Rule Name"
🤖 [Toast notification appears]`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
