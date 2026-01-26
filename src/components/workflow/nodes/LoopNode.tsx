import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Repeat } from 'lucide-react';

interface NodeData {
  label?: string;
  array_source?: string;
  item_variable?: string;
  [key: string]: unknown;
}

const LoopNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  return (
    <div className={`
      px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px]
      bg-white dark:bg-slate-800 border-pink-200 dark:border-pink-700
      ${selected ? 'ring-2 ring-pink-300 ring-offset-2' : ''}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-pink-500 rounded text-white">
          <Repeat className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Logic</div>
          <div className="font-semibold text-sm">{String(nodeData.label || 'Loop')}</div>
        </div>
      </div>
      {nodeData.array_source && (
        <div className="mt-2 text-xs text-muted-foreground">
          For each: {String(nodeData.item_variable || 'item')} in {String(nodeData.array_source)}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
});

LoopNode.displayName = 'LoopNode';

export default LoopNode;
