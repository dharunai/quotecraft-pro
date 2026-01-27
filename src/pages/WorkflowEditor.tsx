import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  Node,
  Edge,
  Connection,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AdvancedTriggerConfig } from '@/components/workflow/AdvancedTriggerConfig';
import { 
  Save, 
  Play, 
  ArrowLeft, 
  Plus, 
  Zap, 
  Mail, 
  CheckCircle2, 
  Bell, 
  Clock, 
  GitBranch, 
  Repeat, 
  Database, 
  Code, 
  Trash2,
  Settings,
  History,
  Copy,
  MoreHorizontal,
  AlertCircle,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { 
  useWorkflow, 
  useUpdateWorkflow, 
  useSaveWorkflowFlow 
} from '@/hooks/useWorkflows';
import { useWorkflowExecutions, useStartWorkflowExecution } from '@/hooks/useWorkflowExecutions';
import type { WorkflowNode, WorkflowEdge, WorkflowFlowDefinition, WorkflowTriggerConfig } from '@/types/database';

// Define a flexible NodeData type for workflow nodes
interface WorkflowNodeData {
  label?: string;
  event?: string;
  to?: string;
  subject?: string;
  body?: string;
  title?: string;
  priority?: string;
  due_offset_days?: number;
  message?: string;
  notification_type?: string;
  field?: string;
  operator?: string;
  value?: string;
  delay_value?: number;
  delay_unit?: string;
  collection?: string;
  query?: string;
  loop_field?: string;
  entity_type?: string;
  status?: string;
  [key: string]: unknown;
}

// Helper to safely access node data
const getNodeData = (node: Node | null): WorkflowNodeData => {
  return (node?.data as WorkflowNodeData) || {};
};

// Custom Node Components
import TriggerNode from '@/components/workflow/nodes/TriggerNode';
import EmailNode from '@/components/workflow/nodes/EmailNode';
import TaskNode from '@/components/workflow/nodes/TaskNode';
import NotificationNode from '@/components/workflow/nodes/NotificationNode';
import ConditionNode from '@/components/workflow/nodes/ConditionNode';
import DelayNode from '@/components/workflow/nodes/DelayNode';
import LoopNode from '@/components/workflow/nodes/LoopNode';
import FetchDataNode from '@/components/workflow/nodes/FetchDataNode';
import UpdateStatusNode from '@/components/workflow/nodes/UpdateStatusNode';

// Node type mappings
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  email: EmailNode,
  task: TaskNode,
  notification: NotificationNode,
  condition: ConditionNode,
  delay: DelayNode,
  loop: LoopNode,
  fetch_data: FetchDataNode,
  update_status: UpdateStatusNode,
};

// Node palette items
const nodePalette = [
  { 
    category: 'Triggers',
    items: [
      { type: 'trigger', label: 'Event Trigger', icon: Zap, color: 'bg-purple-500' },
    ]
  },
  {
    category: 'Actions',
    items: [
      { type: 'email', label: 'Send Email', icon: Mail, color: 'bg-blue-500' },
      { type: 'task', label: 'Create Task', icon: CheckCircle2, color: 'bg-green-500' },
      { type: 'notification', label: 'Send Notification', icon: Bell, color: 'bg-yellow-500' },
      { type: 'update_status', label: 'Update Status', icon: Database, color: 'bg-indigo-500' },
    ]
  },
  {
    category: 'Logic',
    items: [
      { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-orange-500' },
      { type: 'delay', label: 'Delay', icon: Clock, color: 'bg-cyan-500' },
      { type: 'loop', label: 'Loop', icon: Repeat, color: 'bg-pink-500' },
    ]
  },
  {
    category: 'Data',
    items: [
      { type: 'fetch_data', label: 'Fetch Data', icon: Database, color: 'bg-teal-500' },
    ]
  }
];

// Default edge style
const defaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: 'hsl(var(--primary))',
  },
  animated: true,
};

function WorkflowCanvas() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes } = useReactFlow();
  
  // Fetch workflow data
  const { data: workflow, isLoading } = useWorkflow(id);
  const { data: executions } = useWorkflowExecutions(id);
  const updateWorkflow = useUpdateWorkflow();
  const saveFlow = useSaveWorkflowFlow();
  const startExecution = useStartWorkflowExecution();
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // UI state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  
  // Load workflow data into canvas
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');
      
      // Load flow definition
      if (workflow.flow_definition) {
        const flowDef = workflow.flow_definition;
        setNodes(flowDef.nodes?.map(n => ({
          ...n,
          position: n.position || { x: 0, y: 0 },
        })) || []);
        setEdges(flowDef.edges || []);
      }
    }
  }, [workflow, setNodes, setEdges]);
  
  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        ...defaultEdgeOptions,
      }, eds));
    },
    [setEdges]
  );
  
  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowNodeConfig(true);
  }, []);
  
  // Handle drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('label');
      
      if (!type || !reactFlowWrapper.current) return;
      
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { 
          label: label || type,
          // Default configuration based on type
          ...getDefaultNodeData(type),
        },
      };
      
      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );
  
  // Get default node data based on type
  const getDefaultNodeData = (type: string) => {
    switch (type) {
      case 'trigger':
        return { event: 'lead.created' };
      case 'email':
        return { to: '', subject: '', body: '' };
      case 'task':
        return { title: '', priority: 'medium', due_offset_days: 1 };
      case 'notification':
        return { title: '', message: '', type: 'info' };
      case 'condition':
        return { field: '', operator: 'equals', value: '' };
      case 'delay':
        return { delay_value: 1, delay_unit: 'days' };
      case 'loop':
        return { array_source: '', item_variable: 'item' };
      case 'fetch_data':
        return { table: '', filters: [] };
      case 'update_status':
        return { table: '', field: '', value: '' };
      default:
        return {};
    }
  };
  
  // Update node data
  const updateNodeData = useCallback((nodeId: string, newData: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          };
        }
        return node;
      })
    );
  }, [setNodes]);
  
  // Delete selected node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    setShowNodeConfig(false);
  }, [setNodes, setEdges]);
  
  // Save workflow
  const handleSave = async () => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      // Update name and description
      await updateWorkflow.mutateAsync({
        id,
        name: workflowName,
        description: workflowDescription || null,
      });
      
      // Save flow definition
      const flowDefinition: WorkflowFlowDefinition = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type || 'default',
          position: n.position,
          data: n.data as any,
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || undefined,
          targetHandle: e.targetHandle || undefined,
        })),
      };
      
      await saveFlow.mutateAsync({
        id,
        flow_definition: flowDefinition,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Test workflow
  const handleTest = async () => {
    if (!id) return;
    await startExecution.mutateAsync({
      workflowId: id,
      triggerData: { test: true },
    });
    setShowExecutionHistory(true);
  };
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-140px)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }
  
  if (!workflow) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Workflow not found</p>
          <Button onClick={() => navigate('/workflows')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-100px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-xl font-bold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                placeholder="Workflow Name"
              />
              <p className="text-sm text-muted-foreground">
                {workflow.is_active ? (
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
                <span className="ml-2">v{workflow.version}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExecutionHistory(true)}>
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={handleTest} disabled={startExecution.isPending}>
              {startExecution.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Test
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
        
        {/* Canvas */}
        <div className="flex-1 flex">
          {/* Node Palette */}
          <div className="w-64 border-r bg-muted/30 overflow-auto">
            <div className="p-4 space-y-4">
              <h3 className="font-semibold">Components</h3>
              <p className="text-xs text-muted-foreground">Drag and drop to canvas</p>
              
              {nodePalette.map((category) => (
                <div key={category.category} className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {category.category}
                  </h4>
                  <div className="space-y-1">
                    {category.items.map((item) => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/reactflow', item.type);
                          e.dataTransfer.setData('label', item.label);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="flex items-center gap-2 p-2 rounded-md border bg-background cursor-grab hover:border-primary transition-colors"
                      >
                        <div className={`p-1.5 rounded ${item.color} text-white`}>
                          <item.icon className="h-3 w-3" />
                        </div>
                        <span className="text-sm">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* React Flow Canvas */}
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              connectionMode={ConnectionMode.Loose}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
            >
              <Controls />
              <MiniMap 
                nodeStrokeColor={(n) => {
                  if (n.type === 'trigger') return '#a855f7';
                  if (n.type === 'condition') return '#f97316';
                  return '#3b82f6';
                }}
                nodeColor={(n) => {
                  if (n.type === 'trigger') return '#a855f7';
                  if (n.type === 'condition') return '#f97316';
                  return '#3b82f6';
                }}
              />
              <Background gap={15} size={1} />
            </ReactFlow>
          </div>
        </div>
        
        {/* Node Configuration Sheet */}
        <Sheet open={showNodeConfig} onOpenChange={setShowNodeConfig}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Configure Node</SheetTitle>
              <SheetDescription>
                {selectedNode?.type && `Type: ${selectedNode.type}`}
              </SheetDescription>
            </SheetHeader>
            {selectedNode && (() => {
              const nodeData = getNodeData(selectedNode);
              return (
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={nodeData.label || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    placeholder="Node label"
                  />
                </div>
                
                {/* Type-specific configuration */}
                {selectedNode.type === 'trigger' && (
                  <div className="space-y-2">
                    <Label>Event</Label>
                    <Select
                      value={nodeData.event || 'lead.created'}
                      onValueChange={(v) => updateNodeData(selectedNode.id, { event: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead.created">Lead Created</SelectItem>
                        <SelectItem value="lead.qualified">Lead Qualified</SelectItem>
                        <SelectItem value="deal.created">Deal Created</SelectItem>
                        <SelectItem value="deal.won">Deal Won</SelectItem>
                        <SelectItem value="deal.lost">Deal Lost</SelectItem>
                        <SelectItem value="quotation.sent">Quotation Sent</SelectItem>
                        <SelectItem value="quotation.accepted">Quotation Accepted</SelectItem>
                        <SelectItem value="invoice.created">Invoice Created</SelectItem>
                        <SelectItem value="invoice.paid">Invoice Paid</SelectItem>
                        <SelectItem value="task.completed">Task Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedNode.type === 'email' && (
                  <>
                    <div className="space-y-2">
                      <Label>To (use {"{{lead.email}}"} for variables)</Label>
                      <Input
                        value={nodeData.to || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { to: e.target.value })}
                        placeholder="{{lead.email}}"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={nodeData.subject || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { subject: e.target.value })}
                        placeholder="Email subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Body</Label>
                      <Textarea
                        value={nodeData.body || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { body: e.target.value })}
                        placeholder="Email body..."
                        rows={5}
                      />
                    </div>
                  </>
                )}
                
                {selectedNode.type === 'task' && (
                  <>
                    <div className="space-y-2">
                      <Label>Task Title</Label>
                      <Input
                        value={nodeData.title || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                        placeholder="Follow up with {{lead.company_name}}"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={nodeData.priority || 'medium'}
                        onValueChange={(v) => updateNodeData(selectedNode.id, { priority: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due in (days)</Label>
                      <Input
                        type="number"
                        value={nodeData.due_offset_days || 1}
                        onChange={(e) => updateNodeData(selectedNode.id, { due_offset_days: parseInt(e.target.value) })}
                        min={0}
                      />
                    </div>
                  </>
                )}
                
                {selectedNode.type === 'notification' && (
                  <>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={nodeData.title || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                        placeholder="Notification title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea
                        value={nodeData.message || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                        placeholder="Notification message..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={nodeData.notification_type || 'info'}
                        onValueChange={(v) => updateNodeData(selectedNode.id, { notification_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {selectedNode.type === 'condition' && (
                  <>
                    <div className="space-y-2">
                      <Label>Field</Label>
                      <Input
                        value={nodeData.field || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { field: e.target.value })}
                        placeholder="deal.deal_value"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Operator</Label>
                      <Select
                        value={nodeData.operator || 'equals'}
                        onValueChange={(v) => updateNodeData(selectedNode.id, { operator: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="not_equals">Not Equals</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="not_contains">Not Contains</SelectItem>
                          <SelectItem value="is_empty">Is Empty</SelectItem>
                          <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        value={nodeData.value || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                        placeholder="Comparison value"
                      />
                    </div>
                  </>
                )}
                
                {selectedNode.type === 'delay' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Duration</Label>
                        <Input
                          type="number"
                          value={nodeData.delay_value || 1}
                          onChange={(e) => updateNodeData(selectedNode.id, { delay_value: parseInt(e.target.value) })}
                          min={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select
                          value={nodeData.delay_unit || 'days'}
                          onValueChange={(v) => updateNodeData(selectedNode.id, { delay_unit: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">Minutes</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Node
                </Button>
              </div>
              );
            })()}
          </SheetContent>
        </Sheet>
        
        {/* Execution History Sheet */}
        <Sheet open={showExecutionHistory} onOpenChange={setShowExecutionHistory}>
          <SheetContent className="sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Execution History</SheetTitle>
              <SheetDescription>
                Recent workflow runs
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-150px)] mt-4">
              <div className="space-y-3">
                {executions?.map((execution) => (
                  <Card key={execution.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {execution.status === 'completed' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {execution.status === 'failed' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {execution.status === 'running' && (
                          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                        )}
                        <span className="font-medium text-sm">
                          {execution.trigger_event}
                        </span>
                      </div>
                      <Badge variant={
                        execution.status === 'completed' ? 'default' :
                        execution.status === 'failed' ? 'destructive' :
                        execution.status === 'running' ? 'secondary' :
                        'outline'
                      }>
                        {execution.status}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(execution.started_at).toLocaleString()}
                      {execution.duration_ms && (
                        <span className="ml-2">
                          ({execution.duration_ms}ms)
                        </span>
                      )}
                    </div>
                    {execution.error_message && (
                      <p className="mt-2 text-xs text-red-500">
                        {execution.error_message}
                      </p>
                    )}
                  </Card>
                ))}
                {(!executions || executions.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No executions yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        
        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Workflow Settings</DialogTitle>
              <DialogDescription>
                Configure workflow behavior, error handling, and advanced triggers
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Triggers</TabsTrigger>
              </TabsList>
              
              {/* General Settings Tab */}
              <TabsContent value="general" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    placeholder="Describe what this workflow does..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Error Handling</Label>
                  <Select
                    value={workflow.error_handling}
                    onValueChange={(v) => updateWorkflow.mutate({ id: workflow.id, error_handling: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stop">Stop on Error</SelectItem>
                      <SelectItem value="continue">Continue on Error</SelectItem>
                      <SelectItem value="retry">Retry on Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {workflow.error_handling === 'retry' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Retries</Label>
                      <Input
                        type="number"
                        value={workflow.max_retries}
                        onChange={(e) => updateWorkflow.mutate({ id: workflow.id, max_retries: parseInt(e.target.value) })}
                        min={1}
                        max={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Retry Delay (sec)</Label>
                      <Input
                        type="number"
                        value={workflow.retry_delay_seconds}
                        onChange={(e) => updateWorkflow.mutate({ id: workflow.id, retry_delay_seconds: parseInt(e.target.value) })}
                        min={10}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable this workflow to run automatically
                    </p>
                  </div>
                  <Switch
                    checked={workflow.is_active}
                    onCheckedChange={(checked) => updateWorkflow.mutate({ id: workflow.id, is_active: checked })}
                  />
                </div>
              </TabsContent>
              
              {/* Advanced Triggers Tab */}
              <TabsContent value="advanced" className="py-4">
                <AdvancedTriggerConfig
                  triggerConfig={workflow.trigger_config || {}}
                  onConfigChange={(config: WorkflowTriggerConfig) => {
                    updateWorkflow.mutate({
                      id: workflow.id,
                      trigger_config: config,
                    });
                  }}
                />
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default function WorkflowBuilderPage() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}
