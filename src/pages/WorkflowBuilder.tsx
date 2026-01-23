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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Save, Plus, Play, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const initialNodes: Node[] = [
    {
        id: 'trigger-1',
        type: 'input',
        data: { label: 'Trigger: Lead Created' },
        position: { x: 250, y: 5 },
        className: 'bg-primary text-primary-foreground font-semibold rounded-md p-2'
    },
    {
        id: 'action-1',
        data: { label: 'Action: Send Welcome Email' },
        position: { x: 100, y: 150 },
        className: 'bg-secondary border-2 border-primary rounded-md p-2'
    },
    {
        id: 'action-2',
        data: { label: 'Action: Create Task' },
        position: { x: 400, y: 150 },
        className: 'bg-secondary border-2 border-primary rounded-md p-2'
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: 'trigger-1', target: 'action-1', animated: true },
    { id: 'e1-3', source: 'trigger-1', target: 'action-2', animated: true },
];

export default function WorkflowBuilder() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const onSave = () => {
        toast.success('Workflow saved successfully', {
            description: 'Your automation logic has been updated.'
        });
    };

    return (
        <AppLayout>
            <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Visual Workflow Builder</h1>
                        <p className="text-muted-foreground">Design complex automation paths with a drag-and-drop interface.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline">
                            <Play className="h-4 w-4 mr-2" />
                            Test Flow
                        </Button>
                        <Button onClick={onSave}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Workflow
                        </Button>
                    </div>
                </div>

                <div className="flex-1 border-2 border-dashed rounded-xl overflow-hidden bg-card relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        fitView
                    >
                        <Controls />
                        <MiniMap />
                        <Background gap={12} size={1} />
                        <Panel position="top-right">
                            <Card className="p-3 bg-background/80 backdrop-blur-sm space-y-3 w-48 shadow-lg border-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Components</h4>
                                <div className="grid gap-2">
                                    <Button variant="outline" size="sm" className="justify-start text-xs h-8">
                                        <Plus className="h-3 w-3 mr-2" /> Trigger
                                    </Button>
                                    <Button variant="outline" size="sm" className="justify-start text-xs h-8">
                                        <Plus className="h-3 w-3 mr-2" /> Action
                                    </Button>
                                    <Button variant="outline" size="sm" className="justify-start text-xs h-8">
                                        <Plus className="h-3 w-3 mr-2" /> Condition
                                    </Button>
                                </div>
                            </Card>
                        </Panel>
                        <Panel position="bottom-left">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                                <Info className="h-3 w-3" />
                                Drag nodes to organize. Connect points to define logic flow.
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>
            </div>
        </AppLayout>
    );
}
