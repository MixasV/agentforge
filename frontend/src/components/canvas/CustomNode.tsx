import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, Zap, GitBranch, Brain, LucideIcon } from 'lucide-react';
import clsx from 'clsx';

type Category = 'data' | 'action' | 'logic' | 'ai';

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
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

export const CustomNode = memo(({ data, selected }: NodeProps) => {
  const category = (data.category as Category) || 'data';
  const Icon = CATEGORY_ICONS[category];
  const styles = CATEGORY_STYLES[category];

  return (
    <div
      className={clsx(
        'px-4 py-3 rounded-lg border-2 transition-all min-w-[240px] max-w-[280px]',
        'bg-dark-card shadow-lg',
        styles.border,
        selected ? `${styles.shadow} shadow-lg ring-2 ring-offset-2 ring-offset-dark-bg ${styles.border}` : ''
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !w-3 !h-3 !border-2 !border-dark-bg"
      />

      <div className="flex items-start gap-3">
        <div className={clsx('p-2 rounded-md', styles.iconBg)}>
          <Icon size={20} className={styles.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-white mb-1 truncate">
            {data.label}
          </h3>
          {data.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-2">
              {data.description}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className={clsx('text-xs px-2 py-0.5 rounded', styles.bg, styles.iconColor)}>
              {category}
            </span>
            {data.creditsCost !== undefined && (
              <span className="text-xs text-gray-500">
                {data.creditsCost === 0 ? 'FREE' : `${data.creditsCost}c`}
              </span>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 !w-3 !h-3 !border-2 !border-dark-bg"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
