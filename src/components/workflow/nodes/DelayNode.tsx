import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';

interface NodeData {
  label?: string;
  delay_value?: number;
  delay_unit?: string;
  [key: string]: unknown;
}

const DelayNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  return (
    <div className={`
      px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px]
      bg-white dark:bg-slate-800 border-cyan-200 dark:border-cyan-700
      ${selected ? 'ring-2 ring-cyan-300 ring-offset-2' : ''}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-cyan-500 rounded text-white">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Logic</div>
          <div className="font-semibold text-sm">{String(nodeData.label || 'Delay')}</div>
        </div>
      </div>
      {nodeData.delay_value && (
        <div className="mt-2 text-xs bg-cyan-50 dark:bg-cyan-900/30 rounded px-2 py-1 text-cyan-700 dark:text-cyan-300">
          Wait {String(nodeData.delay_value)} {String(nodeData.delay_unit || 'days')}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
});

DelayNode.displayName = 'DelayNode';

export default DelayNode;
