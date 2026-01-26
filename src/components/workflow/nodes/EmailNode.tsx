import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mail } from 'lucide-react';

interface NodeData {
  label?: string;
  to?: string;
  subject?: string;
  body?: string;
  [key: string]: unknown;
}

const EmailNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  return (
    <div className={`
      px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px]
      bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700
      ${selected ? 'ring-2 ring-blue-300 ring-offset-2' : ''}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-blue-500 rounded text-white">
          <Mail className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</div>
          <div className="font-semibold text-sm">{String(nodeData.label || 'Send Email')}</div>
        </div>
      </div>
      {nodeData.to && (
        <div className="mt-2 text-xs text-muted-foreground truncate max-w-[160px]">
          To: {String(nodeData.to)}
        </div>
      )}
      {nodeData.subject && (
        <div className="text-xs text-muted-foreground truncate max-w-[160px]">
          Subject: {String(nodeData.subject)}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
});

EmailNode.displayName = 'EmailNode';

export default EmailNode;
