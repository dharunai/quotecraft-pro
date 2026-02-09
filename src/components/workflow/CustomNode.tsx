import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { FileText, List as ListIcon, CheckSquare } from 'lucide-react';

const icons = {
    record: FileText,
    list: ListIcon,
    task: CheckSquare,
};

function CustomNode({ data, selected }: NodeProps) {
    const Icon = icons[data.type as keyof typeof icons] || FileText;

    return (
        <div className={`relative w-[280px] rounded-xl bg-white shadow-sm border transition-all duration-200 ${selected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'}`}>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-900 !-top-1.5 !border-white" />

            <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-900" />
                    <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">{data.label as string}</span>
                </div>

                <div className="p-2 bg-gray-50 rounded-lg mb-1 border border-gray-100">
                    <span className="text-xs font-bold text-gray-900 block mb-0.5">
                        {data.action as string || 'Action'}
                    </span>
                    <p className="text-[10px] text-gray-500 leading-tight">
                        {data.description as string || 'No description'}
                    </p>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-gray-900 !-bottom-1.5 !border-white" />
        </div>
    );
}

export default memo(CustomNode);
