import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';

interface NodeData {
  label?: string;
  event?: string;
  [key: string]: unknown;
}

const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  return (
    <div className={`
      px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px]
      bg-gradient-to-r from-purple-500 to-purple-600 text-white
      ${selected ? 'ring-2 ring-purple-300 ring-offset-2' : ''}
    `}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-white/20 rounded">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-80">Trigger</div>
          <div className="font-semibold text-sm">{String(nodeData.label || 'Event Trigger')}</div>
        </div>
      </div>
      {nodeData.event && (
        <div className="mt-2 text-xs bg-white/10 rounded px-2 py-1">
          {String(nodeData.event)}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-white !w-3 !h-3 !border-2 !border-purple-600"
      />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';

export default TriggerNode;
