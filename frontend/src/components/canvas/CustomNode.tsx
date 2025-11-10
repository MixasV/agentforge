import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, Zap, GitBranch, Brain, Check, X, Loader2, LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { useWorkflowStore } from '../../store/workflowStore';
import '../../styles/nodeExecution.css';

type Category = 'data' | 'action' | 'logic' | 'ai' | 'trigger';

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  trigger: Zap,
  data: Database,
  action: Zap,
  logic: GitBranch,
  ai: Brain,
};

const CATEGORY_STYLES: Record<Category, {
  border: string;
  bg: string;
  iconBg: string;
  iconColor: string;
  shadow: string;
}> = {
  trigger: {
    border: 'border-green-400/50',
    bg: 'bg-green-400/10',
    iconBg: 'bg-green-400/20',
    iconColor: 'text-green-400',
    shadow: 'shadow-green-400/20',
  },
  data: {
    border: 'border-blue-400/50',
    bg: 'bg-blue-400/10',
    iconBg: 'bg-blue-400/20',
    iconColor: 'text-blue-400',
    shadow: 'shadow-blue-400/20',
  },
  action: {
    border: 'border-red-400/50',
    bg: 'bg-red-400/10',
    iconBg: 'bg-red-400/20',
    iconColor: 'text-red-400',
    shadow: 'shadow-red-400/20',
  },
  logic: {
    border: 'border-yellow-400/50',
    bg: 'bg-yellow-400/10',
    iconBg: 'bg-yellow-400/20',
    iconColor: 'text-yellow-400',
    shadow: 'shadow-yellow-400/20',
  },
  ai: {
    border: 'border-purple-400/50',
    bg: 'bg-purple-400/10',
    iconBg: 'bg-purple-400/20',
    iconColor: 'text-purple-400',
    shadow: 'shadow-purple-400/20',
  },
};

export const CustomNode = memo(({ data, selected, id }: NodeProps) => {
  const category = (data.category as Category) || 'data';
  const Icon = CATEGORY_ICONS[category];
  const styles = CATEGORY_STYLES[category];
  
  // Get execution state from store
  const executionState = useWorkflowStore((state) => state.executionStates[id]) || 'idle';

  // Execution indicator icons
  const ExecutionIndicator = () => {
    if (executionState === 'executing') {
      return (
        <div className="execution-indicator executing">
          <Loader2 size={12} className="text-white animate-spin" />
        </div>
      );
    }
    if (executionState === 'success') {
      return (
        <div className="execution-indicator success">
          <Check size={12} className="text-white" />
        </div>
      );
    }
    if (executionState === 'error') {
      return (
        <div className="execution-indicator error">
          <X size={12} className="text-white" />
        </div>
      );
    }
    return null;
  };

  return (
    <div
      data-execution-state={executionState}
      className={clsx(
        'px-2 py-1.5 rounded border transition-all w-[140px] relative',
        'bg-dark-card shadow-sm',
        styles.border,
        selected ? `${styles.shadow} shadow-md ring-1 ring-offset-1 ring-offset-dark-bg ${styles.border}` : ''
      )}
    >
      <ExecutionIndicator />
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !w-1.5 !h-1.5 !border-0"
      />

      <div className="flex items-start gap-1.5">
        <div className={clsx('p-1 rounded', styles.iconBg)}>
          <Icon size={12} className={styles.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[10px] text-white mb-0.5 truncate leading-tight">
            {data.label}
          </h3>
          {data.description && (
            <p className="text-[8px] text-gray-400 line-clamp-2 mb-0.5 leading-tight">
              {data.description}
            </p>
          )}
          <div className="flex items-center gap-1">
            <span className={clsx('text-[8px] px-1 py-0.5 rounded leading-none', styles.bg, styles.iconColor)}>
              {category}
            </span>
            {data.creditsCost !== undefined && data.creditsCost > 0 && (
              <span className="text-[8px] text-gray-500 leading-none">
                {data.creditsCost}c
              </span>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 !w-1.5 !h-1.5 !border-0"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
