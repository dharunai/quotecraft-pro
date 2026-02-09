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
import { Search, X, ChevronRight, FileText, List as ListIcon, CheckSquare, Save, Play, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import CustomNode from '@/components/workflow/CustomNode';
import { useNavigate } from 'react-router-dom';

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
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true, style: { stroke: '#000000', strokeWidth: 1.5 } },
  { id: 'e1-3', source: '1', target: '3', type: 'smoothstep', animated: true, style: { stroke: '#000000', strokeWidth: 1.5 } },
];

export default function WorkflowEditor() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#000000', strokeWidth: 1.5 } }, eds)),
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

      const position = {
        x: event.nativeEvent.offsetX,
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
      <div className="h-[calc(100vh-80px)] flex bg-white font-sans">
        {/* Canvas Area */}
        <div className="flex-1 relative border-r border-gray-100">
          <div className="absolute top-6 left-8 z-10 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')} className="h-8 w-8 hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Button>
            <h1 className="text-lg font-bold mb-0 text-gray-900 tracking-tight">Customise automation</h1>
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
            className="bg-gray-50/30"
          >
            <Background gap={20} size={1} color="#e5e7eb" />
            <Controls className="bg-white border-gray-200 shadow-sm text-gray-600" showInteractive={false} />
          </ReactFlow>

          <div className="absolute bottom-6 right-6 flex gap-2">
            <Button variant="outline" onClick={() => setSelectedNodeId(null)} className="text-xs">Cancel</Button>
            <Button className="bg-black hover:bg-gray-800 text-xs" onClick={onSave}>Save Automation</Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[350px] bg-white flex flex-col h-full border-l border-gray-100 shadow-xl shadow-gray-100/30 z-20">
          <div className="h-14 flex items-center justify-between px-5 border-b border-gray-100">
            <h2 className="font-semibold text-sm text-gray-900">{selectedNode ? 'Edit Action' : 'Workflow'}</h2>
            <Button variant="ghost" size="icon" onClick={() => setSelectedNodeId(null)} className="h-6 w-6">
              <X className="w-3 h-3 text-gray-400" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {selectedNode ? (
              <div className="space-y-5 animate-in slide-in-from-right-2 duration-300">
                <div className="space-y-4">
                  <div className="p-3 border border-gray-200 bg-gray-50/50 rounded-lg flex items-start gap-3">
                    <div className="p-1.5 bg-gray-200 rounded-md">
                      <FileText className="w-4 h-4 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">{selectedNode.data.label as string}</h3>
                      <p className="text-[10px] text-gray-500 mt-1">Configure parameters.</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={selectedNode.data.description as string || ''}
                      onChange={(e) => updateNodeData('description', e.target.value)}
                      placeholder="Add description..."
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Input</Label>
                    <Select defaultValue="lead">
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select entity" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead" className="text-xs">Lead Entity</SelectItem>
                        <SelectItem value="deal" className="text-xs">Deal Entity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="w-full bg-black hover:bg-gray-800 text-xs h-8" onClick={() => setSelectedNodeId(null)}>
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Search actions..."
                    className="pl-8 bg-gray-50/50 border-gray-200 h-8 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Records</h3>
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'record', 'Record')}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900" />
                      <span className="text-xs font-medium text-gray-700">Record command</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'record', 'Create')}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900" />
                      <span className="text-xs font-medium text-gray-700">Record created</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Lists</h3>
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'list', 'List')}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ListIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900" />
                      <span className="text-xs font-medium text-gray-700">List entry command</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tasks</h3>
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, 'task', 'Task')}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckSquare className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900" />
                      <span className="text-xs font-medium text-gray-700">Complete task</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
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
