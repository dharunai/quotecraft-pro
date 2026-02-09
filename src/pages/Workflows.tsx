import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreHorizontal,
  Loader2,
  Zap,
  Play,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  Workflow,
  FileText
} from 'lucide-react';
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow, useToggleWorkflow, useDuplicateWorkflow, useRenameWorkflow } from '@/hooks/useWorkflows';
import { useWorkflowTemplates, useCreateWorkflowFromTemplate } from '@/hooks/useWorkflowTemplates';
import { useWorkflowExecutionStats } from '@/hooks/useWorkflowExecutions';
import type { WorkflowDefinition, WorkflowTemplate } from '@/types/database';

// Helper for template icons
const templateIcons: Record<string, any> = {
  zap: Zap,
  mail: FileText,
  // Add other mappings as needed
};

export default function Workflows() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameWorkflowId, setRenameWorkflowId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowTrigger, setNewWorkflowTrigger] = useState<'event' | 'schedule' | 'webhook' | 'manual'>('event');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [templateWorkflowName, setTemplateWorkflowName] = useState('');

  const { data: workflows, isLoading } = useWorkflows();
  const { data: templates } = useWorkflowTemplates();
  const { data: stats } = useWorkflowExecutionStats();
  const createWorkflow = useCreateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const toggleWorkflow = useToggleWorkflow();
  const duplicateWorkflow = useDuplicateWorkflow();
  const renameWorkflow = useRenameWorkflow();
  const createFromTemplate = useCreateWorkflowFromTemplate();

  // Filter workflows
  const filteredWorkflows = workflows?.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const activeWorkflows = filteredWorkflows.filter(w => w.is_active);
  const draftWorkflows = filteredWorkflows.filter(w => !w.is_active);

  // Create new workflow
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return;

    const workflow = await createWorkflow.mutateAsync({
      name: newWorkflowName,
      trigger_type: newWorkflowTrigger,
    });

    setShowCreateDialog(false);
    setNewWorkflowName('');
    navigate(`/workflows/${workflow.id}`);
  };

  // Create from template
  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !templateWorkflowName.trim()) return;

    const workflow = await createFromTemplate.mutateAsync({
      templateId: selectedTemplate.id,
      name: templateWorkflowName,
    });

    setShowTemplateDialog(false);
    setSelectedTemplate(null);
    setTemplateWorkflowName('');
    navigate(`/workflows/${workflow.id}`);
  };

  // Render workflow card
  const WorkflowCard = ({ workflow }: { workflow: WorkflowDefinition }) => {
    const successRate = workflow.execution_count > 0
      ? Math.round((workflow.success_count / workflow.execution_count) * 100)
      : 0;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{workflow.name}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {workflow.trigger_type === 'event' && 'Event-triggered'}
                  {workflow.trigger_type === 'schedule' && 'Scheduled'}
                  {workflow.trigger_type === 'webhook' && 'Webhook'}
                  {workflow.trigger_type === 'manual' && 'Manual'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={workflow.is_active}
                onCheckedChange={(checked) => toggleWorkflow.mutate({ id: workflow.id, is_active: checked })}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/workflows/${workflow.id}`)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setRenameWorkflowId(workflow.id);
                    setRenameValue(workflow.name);
                    setShowRenameDialog(true);
                  }}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicateWorkflow.mutate(workflow.id)}>
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteWorkflow.mutate(workflow.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {workflow.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {workflow.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Play className="h-3 w-3 text-muted-foreground" />
                <span>{workflow.execution_count} runs</span>
              </div>
              {workflow.execution_count > 0 && (
                <div className="flex items-center gap-1">
                  {successRate >= 90 ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : successRate >= 70 ? (
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>{successRate}% success</span>
                </div>
              )}
            </div>
            {workflow.last_executed_at && (
              <span className="text-muted-foreground">
                Last: {new Date(workflow.last_executed_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {workflow.tags && workflow.tags.length > 0 && (
            <div className="flex gap-1 mt-3">
              {workflow.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render template card
  const TemplateCard = ({ template }: { template: WorkflowTemplate }) => {
    const IconComponent = template.icon ? templateIcons[template.icon] || Sparkles : Sparkles;

    return (
      <Card
        className="cursor-pointer hover:border-primary transition-colors"
        onClick={() => {
          setSelectedTemplate(template);
          setTemplateWorkflowName(template.name);
          setShowTemplateDialog(true);
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconComponent className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">{template.name}</CardTitle>
              {template.category && (
                <Badge variant="outline" className="text-[10px] mt-1">
                  {template.category}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>
          {template.is_featured && (
            <Badge className="mt-2 text-[10px]" variant="secondary">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Workflows
            </h1>
            <p className="text-muted-foreground">
              Create and manage visual automation workflows
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Blank Workflow
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Workflows</p>
                  <p className="text-2xl font-bold">{workflows?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{activeWorkflows.length}</p>
                </div>
                <Play className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Executions (30d)</p>
                  <p className="text-2xl font-bold">{stats?.totalExecutions || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{stats?.successRate || 0}%</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates Section */}
        {templates && templates.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Start from Template
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {templates.slice(0, 4).map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Workflows List */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({filteredWorkflows.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeWorkflows.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({draftWorkflows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <Card className="py-12">
                <div className="text-center">
                  <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first workflow to automate your business processes
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workflow
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkflows.map((workflow) => (
                  <WorkflowCard key={workflow.id} workflow={workflow} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            {activeWorkflows.length === 0 ? (
              <Card className="py-8">
                <p className="text-center text-muted-foreground">No active workflows</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeWorkflows.map((workflow) => (
                  <WorkflowCard key={workflow.id} workflow={workflow} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="drafts" className="mt-4">
            {draftWorkflows.length === 0 ? (
              <Card className="py-8">
                <p className="text-center text-muted-foreground">No draft workflows</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {draftWorkflows.map((workflow) => (
                  <WorkflowCard key={workflow.id} workflow={workflow} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Workflow Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription>
                Start with a blank workflow and add your automation logic
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Workflow Name</Label>
                <Input
                  placeholder="e.g., Welcome New Leads"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={newWorkflowTrigger}
                  onValueChange={(v: any) => setNewWorkflowTrigger(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event-based</SelectItem>
                    <SelectItem value="schedule">Scheduled</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {newWorkflowTrigger === 'event' && 'Triggered when specific events occur (e.g., lead created)'}
                  {newWorkflowTrigger === 'schedule' && 'Runs on a schedule (daily, weekly, etc.)'}
                  {newWorkflowTrigger === 'webhook' && 'Triggered by external webhooks'}
                  {newWorkflowTrigger === 'manual' && 'Run manually when needed'}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkflow}
                disabled={!newWorkflowName.trim() || createWorkflow.isPending}
              >
                {createWorkflow.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create from Template Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create from Template</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Workflow Name</Label>
                <Input
                  placeholder="Enter workflow name"
                  value={templateWorkflowName}
                  onChange={(e) => setTemplateWorkflowName(e.target.value)}
                />
              </div>
              {selectedTemplate?.configurable_fields && Object.keys(selectedTemplate.configurable_fields).length > 0 && (
                <div className="space-y-3">
                  <Label>Configuration</Label>
                  <p className="text-xs text-muted-foreground">
                    You can customize these settings after creating the workflow
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateFromTemplate}
                disabled={!templateWorkflowName.trim() || createFromTemplate.isPending}
              >
                {createFromTemplate.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rename Workflow Dialog */}
        <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Workflow</DialogTitle>
              <DialogDescription>
                Enter a new name for your workflow
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Workflow Name</Label>
                <Input
                  placeholder="Enter new workflow name"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameValue.trim() && renameWorkflowId) {
                      renameWorkflow.mutate({ id: renameWorkflowId, name: renameValue });
                      setShowRenameDialog(false);
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (renameValue.trim() && renameWorkflowId) {
                    renameWorkflow.mutate({ id: renameWorkflowId, name: renameValue });
                    setShowRenameDialog(false);
                  }
                }}
                disabled={!renameValue.trim() || renameWorkflow.isPending}
              >
                {renameWorkflow.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
