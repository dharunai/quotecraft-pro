import React, { useCallback, useState } from 'react';
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
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, X, ChevronRight, FileText, List as ListIcon, CheckSquare, Save, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { WorkflowDefinition } from '@/types/database';
import CustomNode from '@/components/workflow/CustomNode';

const nodeTypes = {
    custom: CustomNode,
};

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'custom',
        position: { x: 250, y: 50 },
        data: { label: 'Record command', action: 'Record', type: 'record', description: 'Trigger when record created' },
    },
    {
        id: '2',
        type: 'custom',
        position: { x: 100, y: 250 },
        data: { label: 'List entry command', action: 'List', type: 'list', description: 'Add item to list' },
    },
    {
        id: '3',
        type: 'custom',
        position: { x: 400, y: 250 },
        data: { label: 'List entry command', action: 'List', type: 'list', description: 'Update list item' },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: '#2563eb', strokeWidth: 2 } },
    { id: 'e1-3', source: '1', target: '3', type: 'smoothstep', animated: true, style: { stroke: '#2563eb', strokeWidth: 2 } },
];

export default function WorkflowBuilder() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [workflowName, setWorkflowName] = useState('New Workflow');
    const [triggerEvent, setTriggerEvent] = useState('lead_created');
    const [isActive, setIsActive] = useState(false);
    const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);

    // Fetch existing workflow if ID is present
    React.useEffect(() => {
        if (id && id !== 'new') {
            const fetchWorkflow = async () => {
                const { data, error } = await supabase
                    .from('workflow_definitions')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    toast.error('Failed to load workflow');
                    return;
                }

                if (data) {
                    setWorkflow(data as any);
                    setWorkflowName(data.name);
                    setTriggerEvent((data.trigger_config as any)?.event || 'lead_created');
                    setIsActive(data.is_active);

                    if (data.flow_definition) {
                        setNodes((data.flow_definition as any).nodes || []);
                        setEdges((data.flow_definition as any).edges || []);
                    }
                }
            };
            fetchWorkflow();
        }
    }, [id]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#2563eb', strokeWidth: 2 } }, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    const onSave = async () => {
        try {
            const flowDefinition = { nodes, edges };
            const triggerConfig = { event: triggerEvent };

            const workflowData = {
                name: workflowName,
                flow_definition: flowDefinition,
                trigger_config: triggerConfig,
                trigger_type: 'event', // Default to event
                is_active: isActive,
            };

            let error;
            if (id && id !== 'new') {
                const { error: updateError } = await supabase
                    .from('workflow_definitions')
                    .update(workflowData as any) // Type casting to avoid partial type mismatch
                    .eq('id', id);
                error = updateError;
            } else {
                const { data, error: insertError } = await supabase
                    .from('workflow_definitions')
                    .insert([workflowData as any])
                    .select()
                    .single();

                if (data) {
                    navigate(`/settings/workflows/${data.id}`);
                }
                error = insertError;
            }

            if (error) throw error;
            toast.success('Workflow saved', { description: 'Automation logic updated successfully.' });
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to save workflow', { description: err.message });
        }
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    const updateNodeData = (key: string, value: any) => {
        setNodes(nds => nds.map(node => {
            if (node.id === selectedNodeId) {
                // Handle nested config updates
                if (key.startsWith('config.')) {
                    const configKey = key.split('.')[1];
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            config: { ...(node.data.config as any || {}), [configKey]: value }
                        }
                    };
                }
                return { ...node, data: { ...node.data, [key]: value } };
            }
            return node;
        }));
    };

    // Drag and Drop Logic
    const onDragStart = (event: React.DragEvent, nodeType: string, action: string, defaultLabel: string) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, action, label: defaultLabel }));
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const data = event.dataTransfer.getData('application/reactflow');
            if (!data) return;

            const { type, action, label } = JSON.parse(data);

            const position = {
                x: event.nativeEvent.offsetX,
                y: event.nativeEvent.offsetY,
            };

            const newNode: Node = {
                id: crypto.randomUUID(),
                type: 'custom',
                position,
                data: {
                    label,
                    action,
                    type,
                    description: 'No Description',
                    config: {} // Initialize config
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [setNodes]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    return (
        <AppLayout>
            <div className="h-[calc(100vh-80px)] flex bg-gray-50/50">
                {/* Canvas Area */}
                <div className="flex-1 relative border-r border-gray-200">
                    <div className="absolute top-6 left-8 z-10 bg-white/80 p-4 rounded-xl backdrop-blur-sm border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <Input
                                value={workflowName}
                                onChange={(e) => setWorkflowName(e.target.value)}
                                className="font-bold text-lg border-none bg-transparent h-auto p-0 focus-visible:ring-0"
                            />
                            <div className="flex items-center gap-2">
                                <Label>Active</Label>
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="h-4 w-4"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-semibold uppercase text-gray-500">Trigger:</Label>
                            <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                                <SelectTrigger className="h-8 w-[180px] bg-white">
                                    <SelectValue placeholder="Select Event" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lead_created">Lead Created</SelectItem>
                                    <SelectItem value="lead_qualified">Lead Qualified</SelectItem>
                                    <SelectItem value="deal_won">Deal Won</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-gray-50/50"
                    >
                        <Background gap={20} size={1} color="#e5e7eb" />
                        <Controls className="bg-white border-gray-200 shadow-sm" />
                    </ReactFlow>

                    <div className="absolute bottom-6 right-6 flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/settings/workflows')}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={onSave}><Save className="w-4 h-4 mr-2" /> Save Automation</Button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-[400px] bg-white flex flex-col h-full border-l border-gray-100 shadow-xl shadow-gray-100/50 z-20">
                    <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">{selectedNode ? 'Edit Action' : 'Workflow Components'}</h2>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedNodeId(null)}>
                            <X className="w-4 h-4 text-gray-400" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedNode ? (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-4">
                                    <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-xl flex items-start gap-4">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{selectedNode.data.label as string}</h3>
                                            <p className="text-xs text-gray-500 mt-1">Configure this action's properties.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input
                                            value={selectedNode.data.description as string || ''}
                                            onChange={(e) => updateNodeData('description', e.target.value)}
                                            placeholder="Add description..."
                                        />
                                    </div>

                                    {/* Dynamic Configuration based on Action Type */}
                                    {selectedNode.data.actionType === 'send_email' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>To (Email)</Label>
                                                <Input
                                                    value={(selectedNode.data.config as any)?.to || ''}
                                                    onChange={(e) => updateNodeData('config.to', e.target.value)}
                                                    placeholder="{{lead.email}}"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Subject</Label>
                                                <Input
                                                    value={(selectedNode.data.config as any)?.subject || ''}
                                                    onChange={(e) => updateNodeData('config.subject', e.target.value)}
                                                    placeholder="Welcome!"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Body</Label>
                                                <textarea
                                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 h-32"
                                                    value={(selectedNode.data.config as any)?.body || ''}
                                                    onChange={(e) => updateNodeData('config.body', e.target.value)}
                                                    placeholder="Hello {{lead.contact_name}}..."
                                                />
                                            </div>
                                        </>
                                    )}

                                    {selectedNode.data.actionType === 'create_task' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Task Title</Label>
                                                <Input
                                                    value={(selectedNode.data.config as any)?.title || ''}
                                                    onChange={(e) => updateNodeData('config.title', e.target.value)}
                                                    placeholder="Follow up with {{lead.contact_name}}"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Priority</Label>
                                                <Select
                                                    value={(selectedNode.data.config as any)?.priority || 'medium'}
                                                    onValueChange={(val) => updateNodeData('config.priority', val)}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="low">Low</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="high">High</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </>
                                    )}

                                    {selectedNode.data.type === 'condition' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Field</Label>
                                                <Input
                                                    value={(selectedNode.data.config as any)?.field || ''}
                                                    onChange={(e) => updateNodeData('config.field', e.target.value)}
                                                    placeholder="lead.is_qualified"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Operator</Label>
                                                <Select
                                                    value={(selectedNode.data.config as any)?.operator || 'equals'}
                                                    onValueChange={(val) => updateNodeData('config.operator', val)}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="equals">Equals</SelectItem>
                                                        <SelectItem value="not_equals">Not Equals</SelectItem>
                                                        <SelectItem value="contains">Contains</SelectItem>
                                                        <SelectItem value="greater_than">Greater Than</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Value</Label>
                                                <Input
                                                    value={(selectedNode.data.config as any)?.value || ''}
                                                    onChange={(e) => updateNodeData('config.value', e.target.value)}
                                                    placeholder="true"
                                                />
                                            </div>
                                        </>
                                    )}

                                </div>

                                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setSelectedNodeId(null)}>
                                    Done
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Search actions..."
                                        className="pl-9 bg-gray-50 border-gray-200"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</h3>
                                    <div
                                        draggable
                                        onDragStart={(e) => onDragStart(e, 'action', 'send_email', 'Send Email')}
                                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                            <span className="text-sm font-medium text-gray-700">Send Email</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                    <div
                                        draggable
                                        onDragStart={(e) => onDragStart(e, 'action', 'create_task', 'Create Task')}
                                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                            <span className="text-sm font-medium text-gray-700">Create Task</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Logic</h3>
                                    <div
                                        draggable
                                        onDragStart={(e) => onDragStart(e, 'condition', 'condition', 'Condition')}
                                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <ListIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                            <span className="text-sm font-medium text-gray-700">Condition (If/Else)</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
