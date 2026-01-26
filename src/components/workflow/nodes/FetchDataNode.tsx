import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';

interface NodeData {
  label?: string;
  table?: string;
  [key: string]: unknown;
}

const FetchDataNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  return (
    <div className={`
      px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px]
      bg-white dark:bg-slate-800 border-teal-200 dark:border-teal-700
      ${selected ? 'ring-2 ring-teal-300 ring-offset-2' : ''}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-teal-500 rounded text-white">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Data</div>
          <div className="font-semibold text-sm">{String(nodeData.label || 'Fetch Data')}</div>
        </div>
      </div>
      {nodeData.table && (
        <div className="mt-2 text-xs bg-teal-50 dark:bg-teal-900/30 rounded px-2 py-1 text-teal-700 dark:text-teal-300">
          From: {String(nodeData.table)}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
});

FetchDataNode.displayName = 'FetchDataNode';

export default FetchDataNode;
