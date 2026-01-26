import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';

interface NodeData {
  label?: string;
  table?: string;
  field?: string;
  value?: string;
  [key: string]: unknown;
}

const UpdateStatusNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  return (
    <div className={`
      px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px]
      bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700
      ${selected ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-indigo-500 rounded text-white">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</div>
          <div className="font-semibold text-sm">{String(nodeData.label || 'Update Status')}</div>
        </div>
      </div>
      {nodeData.table && nodeData.field && (
        <div className="mt-2 text-xs text-muted-foreground">
          Set {String(nodeData.table)}.{String(nodeData.field)} = {String(nodeData.value || '')}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
});

UpdateStatusNode.displayName = 'UpdateStatusNode';

export default UpdateStatusNode;
