import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { BlockDefinition } from '@/types';
import { useWorkflowStore } from '@/store/workflowStore';
import { Search, Database, Zap, GitBranch, Brain } from 'lucide-react';
import clsx from 'clsx';

const CATEGORY_ICONS = {
  data: Database,
  action: Zap,
  logic: GitBranch,
  ai: Brain,
};

const CATEGORY_COLORS = {
  data: 'text-blue-400 bg-blue-400/10',
  action: 'text-red-400 bg-red-400/10',
  logic: 'text-yellow-400 bg-yellow-400/10',
  ai: 'text-purple-400 bg-purple-400/10',
};

export function NodePalette() {
  const [search, setSearch] = useState('');
  const { addNode } = useWorkflowStore();

  const { data: blocksData, isLoading } = useQuery({
    queryKey: ['blocks'],
    queryFn: async () => {
      const response = await api.get('/api/blocks');
      return response.data;
    },
  });

  const blocks: (BlockDefinition & { type: string })[] = blocksData?.data?.blocks || [];

  const filteredBlocks = blocks.filter((block) =>
    block.name.toLowerCase().includes(search.toLowerCase()) ||
    block.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragStart = (event: React.DragEvent, blockType: string, block: BlockDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: blockType,
      data: {
        type: blockType,
        label: block.name,
        category: block.category,
        config: {},
      },
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (blockType: string, block: BlockDefinition) => {
    const newNode = {
      id: `${blockType}-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        type: blockType,
        label: block.name,
        category: block.category,
        config: {},
      },
    };
    addNode(newNode);
  };

  return (
    <aside className="w-80 bg-dark-card border-r border-dark-border h-screen overflow-y-auto">
      <div className="p-4 border-b border-dark-border sticky top-0 bg-dark-card z-10">
        <h3 className="text-lg font-semibold mb-3">Available Blocks</h3>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
          />
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading blocks...</div>
        ) : filteredBlocks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No blocks found</div>
        ) : (
          <div className="space-y-2">
            {filteredBlocks.map((block) => {
              const Icon = CATEGORY_ICONS[block.category];
              const colorClass = CATEGORY_COLORS[block.category];

              return (
                <div
                  key={block.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, block.type, block)}
                  onClick={() => handleAddNode(block.type, block)}
                  className={clsx(
                    'p-3 rounded-lg border border-dark-border cursor-move hover:border-solana-purple transition-colors group',
                    'bg-dark-bg'
                  )}
                  title={block.description}
                >
                  <div className="flex items-start gap-3">
                    <div className={clsx('p-2 rounded-lg', colorClass)}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 group-hover:text-solana-purple transition-colors truncate">
                        {block.name}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {block.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={clsx('text-xs px-2 py-0.5 rounded', colorClass)}>
                          {block.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {block.creditsCost} credits
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
