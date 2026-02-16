import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { FileText, List as ListIcon, CheckSquare, Zap, GitBranch, Mail, Clock } from 'lucide-react';

const icons = {
    trigger: Zap,
    action: FileText,
    condition: GitBranch,
    send_email: Mail,
    create_task: CheckSquare,
    delay: Clock,
};

function CustomNode({ data, selected }: NodeProps) {
    const actionType = data.action as string;
    const nodeType = data.type as string;

    // Determine icon based on action or type
    let Icon = icons[nodeType as keyof typeof icons] || FileText;
    if (actionType === 'send_email') Icon = icons.send_email;
    if (actionType === 'create_task') Icon = icons.create_task;
    if (nodeType === 'condition') Icon = icons.condition;

    return (
        <div className={`relative w-[280px] rounded-xl bg-white shadow-sm border transition-all duration-200 ${selected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'}`}>
            {nodeType !== 'trigger' && (
                <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-900 !-top-1.5 !border-white" />
            )}

            <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-md ${nodeType === 'condition' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">{data.label as string}</span>
                </div>

                <div className="p-2 bg-gray-50 rounded-lg mb-1 border border-gray-100">
                    <p className="text-[10px] text-gray-500 leading-tight">
                        {data.description as string || 'No description'}
                    </p>
                    {nodeType === 'condition' && (
                        <div className="mt-1 pt-1 border-t border-gray-200 text-[10px] font-mono text-gray-600">
                            {(data.config as any)?.field} {(data.config as any)?.operator} {(data.config as any)?.value}
                        </div>
                    )}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-gray-900 !-bottom-1.5 !border-white" />

            {/* Condition nodes have two outputs usually, but for now strict single output flow or we handle branching logic in engine with single edge? 
                Actually condition needs two handles (true/false) for visual branching. 
                Let's add them if it's a condition node. 
            */}
            {nodeType === 'condition' && (
                <>
                    <div className="absolute -bottom-6 left-1/4 text-[10px] text-gray-500 font-medium">True</div>
                    <Handle id="true" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-green-500 !-bottom-1.5 !left-1/4 !border-white" />

                    <div className="absolute -bottom-6 right-1/4 text-[10px] text-gray-500 font-medium">False</div>
                    <Handle id="false" type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-red-500 !-bottom-1.5 !right-1/4 !border-white" />
                </>
            )}
        </div>
    );
}

export default memo(CustomNode);
