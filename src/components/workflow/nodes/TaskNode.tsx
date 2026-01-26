import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckCircle2 } from 'lucide-react';

interface NodeData {
  label?: string;
  title?: string;
  priority?: string;
  due_offset_days?: number;
  [key: string]: unknown;
}

const TaskNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as NodeData;
  return (
    <div className={`
      px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px]
      bg-white dark:bg-slate-800 border-green-200 dark:border-green-700
      ${selected ? 'ring-2 ring-green-300 ring-offset-2' : ''}
    `}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-green-500 rounded text-white">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</div>
          <div className="font-semibold text-sm">{String(nodeData.label || 'Create Task')}</div>
        </div>
      </div>
      {nodeData.title && (
        <div className="mt-2 text-xs text-muted-foreground truncate max-w-[160px]">
          {String(nodeData.title)}
        </div>
      )}
      {nodeData.priority && (
        <div className="text-xs">
          <span className={`
            inline-block px-1.5 py-0.5 rounded text-[10px] font-medium
            ${nodeData.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''}
            ${nodeData.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' : ''}
            ${nodeData.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : ''}
            ${nodeData.priority === 'low' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : ''}
          `}>
            {nodeData.priority}
          </span>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';

export default TaskNode;
