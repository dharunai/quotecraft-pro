import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Zap, Plus, Trash2, Edit, Play, Pause, Clock, ArrowRight, Mail, Bell, Tag } from 'lucide-react';
import { useAutomationRules, useCreateAutomationRule, useUpdateAutomationRule, useDeleteAutomationRule, useToggleAutomationRule } from '@/hooks/useAutomation';
import { AutomationRule } from '@/types/database';
import { format } from 'date-fns';

const triggerEvents = [
  { value: 'lead_created', label: 'Lead Created', icon: Plus },
  { value: 'lead_qualified', label: 'Lead Qualified', icon: Tag },
  { value: 'deal_created', label: 'Deal Created', icon: ArrowRight },
  { value: 'deal_won', label: 'Deal Won', icon: Zap },
  { value: 'deal_lost', label: 'Deal Lost', icon: Pause },
  { value: 'quotation_sent', label: 'Quotation Sent', icon: Mail },
  { value: 'quotation_accepted', label: 'Quotation Accepted', icon: Zap },
  { value: 'invoice_created', label: 'Invoice Created', icon: ArrowRight },
  { value: 'invoice_paid', label: 'Invoice Paid', icon: Zap },
  { value: 'task_overdue', label: 'Task Overdue', icon: Clock },
];

const actionTypes = [
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'create_task', label: 'Create Task', icon: Plus },
  { value: 'send_notification', label: 'Send Notification', icon: Bell },
  { value: 'update_status', label: 'Update Status', icon: Tag },
];

export default function AutomationSettings() {
  const { data: rules = [], isLoading } = useAutomationRules();
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const deleteRule = useDeleteAutomationRule();
  const toggleRule = useToggleAutomationRule();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_event: '',
    action_type: 'send_notification',
    action_value: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger_event: '',
      action_type: 'send_notification',
      action_value: '',
      is_active: true,
    });
    setEditingRule(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: AutomationRule) => {
    setEditingRule(rule);
    const actions = rule.actions as { type?: string; value?: string } || {};
    setFormData({
      name: rule.name,
      description: rule.description || '',
      trigger_event: rule.trigger_event,
      action_type: actions.type || 'send_notification',
      action_value: actions.value || '',
      is_active: rule.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const ruleData = {
      name: formData.name,
      description: formData.description || null,
      trigger_event: formData.trigger_event,
      trigger_conditions: null,
      actions: {
        type: formData.action_type,
        value: formData.action_value,
      },
      is_active: formData.is_active,
    };

    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, ...ruleData });
    } else {
      await createRule.mutateAsync(ruleData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleToggle = async (rule: AutomationRule) => {
    await toggleRule.mutateAsync({ id: rule.id, is_active: !rule.is_active });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this automation rule?')) {
      await deleteRule.mutateAsync(id);
    }
  };

  const activeRules = rules.filter(r => r.is_active);
  const inactiveRules = rules.filter(r => !r.is_active);

  const getTriggerLabel = (event: string) => {
    return triggerEvents.find(t => t.value === event)?.label || event;
  };

  const getActionLabel = (type: string) => {
    return actionTypes.find(a => a.value === type)?.label || type;
  };

  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automation Rules</h1>
            <p className="text-muted-foreground">
              Automate your business workflows with trigger-based actions.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/settings/automation/diagnostics')}
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-2" />
              Diagnostics
            </Button>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rules.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Play className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeRules.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {rules.reduce((sum, r) => sum + r.execution_count, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rules List */}
        {isLoading ? (
          <div className="text-center py-12">Loading automation rules...</div>
        ) : rules.length === 0 ? (
          <Card className="p-8 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Automation Rules Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first automation rule to streamline your workflow.
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => {
              const actions = rule.actions as { type?: string; value?: string } || {};
              return (
                <Card key={rule.id} className={`transition-opacity ${!rule.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Zap className={`h-5 w-5 ${rule.is_active ? 'text-gray-600' : 'text-gray-400'}`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{rule.name}</h3>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">When:</span>
                            <Badge variant="outline">{getTriggerLabel(rule.trigger_event)}</Badge>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Then:</span>
                            <Badge variant="outline">{getActionLabel(actions.type || '')}</Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Executed {rule.execution_count} times</span>
                          {rule.last_executed_at && (
                            <span>Last: {format(new Date(rule.last_executed_at), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggle(rule)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Automation Rule' : 'Create New Automation Rule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome email for new leads"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this automation does"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger">When this happens (Trigger) *</Label>
                <Select 
                  value={formData.trigger_event} 
                  onValueChange={(value) => setFormData({ ...formData, trigger_event: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trigger event" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerEvents.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Do this (Action) *</Label>
                <Select 
                  value={formData.action_type} 
                  onValueChange={(value) => setFormData({ ...formData, action_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action_value">Action Details</Label>
                <Textarea
                  id="action_value"
                  value={formData.action_value}
                  onChange={(e) => setFormData({ ...formData, action_value: e.target.value })}
                  placeholder="Email template, task title, notification message, etc."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Enable this rule immediately</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRule.isPending || updateRule.isPending}>
                  {editingRule ? 'Save Changes' : 'Create Rule'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
