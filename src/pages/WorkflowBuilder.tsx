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
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    const onSave = () => {
        toast.success('Workflow saved', { description: 'Automation logic updated successfully.' });
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    const updateNodeData = (key: string, value: string) => {
        setNodes(nds => nds.map(node => {
            if (node.id === selectedNodeId) {
                return { ...node, data: { ...node.data, [key]: value } };
            }
            return node;
        }));
    };

    // Drag and Drop Logic
    const onDragStart = (event: React.DragEvent, nodeType: string, action: string) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, action }));
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const data = event.dataTransfer.getData('application/reactflow');
            if (!data) return;

            const { type, action } = JSON.parse(data);

            // Get chart coordinates
            // NOTE: Ideally we use reactFlowInstance.project() here but for simplicity we mock center drop or relative
            // For now, let's just drop at random slightly varying pos or mouse pos approximation
            const position = {
                x: event.nativeEvent.offsetX, // simple approx, better with ref and project
                y: event.nativeEvent.offsetY,
            };

            const newNode: Node = {
                id: Math.random().toString(),
                type: 'custom',
                position,
                data: { label: `${action} command`, action, type, description: 'No Description' },
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
                    <div className="absolute top-6 left-8 z-10">
                        <h1 className="text-xl font-bold mb-1">Customise automation</h1>
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
                        <Button variant="outline" onClick={() => setSelectedNodeId(null)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={onSave}>Save Automation</Button>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-[400px] bg-white flex flex-col h-full border-l border-gray-100 shadow-xl shadow-gray-100/50 z-20">
                    <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">{selectedNode ? 'Edit Action' : 'Workflow'}</h2>
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

                                    <div className="space-y-2">
                                        <Label>Input</Label>
                                        <Select defaultValue="lead">
                                            <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lead">Lead Entity</SelectItem>
                                                <SelectItem value="deal">Deal Entity</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setSelectedNodeId(null)}>
                                    Save Changes
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
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Records</h3>
                                    <div
                                        draggable
                                        onDragStart={(e) => onDragStart(e, 'record', 'Record')}
                                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                            <span className="text-sm font-medium text-gray-700">Record command</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                    <div
                                        draggable
                                        onDragStart={(e) => onDragStart(e, 'record', 'Create')}
                                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                            <span className="text-sm font-medium text-gray-700">Record created</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Lists</h3>
                                    <div
                                        draggable
                                        onDragStart={(e) => onDragStart(e, 'list', 'List')}
                                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <ListIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                            <span className="text-sm font-medium text-gray-700">List entry command</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tasks</h3>
                                    <div
                                        draggable
                                        onDragStart={(e) => onDragStart(e, 'task', 'Task')}
                                        className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                            <span className="text-sm font-medium text-gray-700">Complete task</span>
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
