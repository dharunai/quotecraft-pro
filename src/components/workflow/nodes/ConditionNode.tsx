import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

interface NodeData {
  label?: string;
  field?: string;
  operator?: string;
  value?: string;
  [key: string]: unknown;
}

const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  return (
    <div className={`
      px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px]
      bg-white dark:bg-slate-800 border-orange-200 dark:border-orange-700
      ${selected ? 'ring-2 ring-orange-300 ring-offset-2' : ''}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-orange-500 rounded text-white">
          <GitBranch className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Logic</div>
          <div className="font-semibold text-sm">{String(nodeData.label || 'Condition')}</div>
        </div>
      </div>
      {nodeData.field && (
        <div className="mt-2 text-xs text-muted-foreground">
          {String(nodeData.field)} {String(nodeData.operator || '')} {String(nodeData.value || '')}
        </div>
      )}
      <div className="flex justify-between mt-2 text-[10px]">
        <span className="text-green-600 dark:text-green-400">✓ True</span>
        <span className="text-red-600 dark:text-red-400">✗ False</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%' }}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%' }}
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';

export default ConditionNode;
