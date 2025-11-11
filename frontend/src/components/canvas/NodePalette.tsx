import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { BlockDefinition } from '@/types';
import { WorkflowVariables } from '@/components/workflow/WorkflowVariables';
import { useWorkflowStore } from '@/store/workflowStore';
import { Search, Database, Zap, GitBranch, Brain, Send, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';

const CATEGORY_ICONS = {
  trigger: Zap,
  data: Database,
  action: Zap,
  logic: GitBranch,
  ai: Brain,
  telegram: Send,
};

const CATEGORY_COLORS = {
  trigger: 'text-green-400 bg-green-400/10',
  data: 'text-blue-400 bg-blue-400/10',
  action: 'text-red-400 bg-red-400/10',
  logic: 'text-yellow-400 bg-yellow-400/10',
  ai: 'text-purple-400 bg-purple-400/10',
  telegram: 'text-cyan-400 bg-cyan-400/10',
};

interface NodePaletteProps {
  workflowId?: string;
  onSave?: () => void;
}

export function NodePalette({ workflowId, onSave }: NodePaletteProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'blocks' | 'variables'>('blocks');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { addNode } = useWorkflowStore();

  const { data: blocksData, isLoading } = useQuery({
    queryKey: ['blocks'],
    queryFn: async () => {
      const response = await api.get('/api/blocks');
      return response.data;
    },
  });

  const blocks: (BlockDefinition & { type: string })[] = blocksData?.data?.blocks || [];

  const filteredBlocks = blocks.filter((block) => {
    const matchesSearch = 
      block.name.toLowerCase().includes(search.toLowerCase()) ||
      block.description.toLowerCase().includes(search.toLowerCase());
    
    // Match by category OR tags (for blocks that should appear in multiple categories)
    const matchesCategory = !categoryFilter || 
      block.category === categoryFilter ||
      (block.tags && block.tags.includes(categoryFilter));
    
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (event: React.DragEvent, blockType: string, block: BlockDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: blockType,
      data: {
        type: blockType,
        label: block.name,
        category: block.category,
        description: block.description,
        creditsCost: block.creditsCost,
        config: {},
      },
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAddNode = (blockType: string, block: BlockDefinition) => {
    const newNode = {
      id: `${blockType}-${Date.now()}`,
      type: 'customNode',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        type: blockType,
        label: block.name,
        category: block.category,
        description: block.description,
        creditsCost: block.creditsCost,
        config: {},
      },
    };
    addNode(newNode);
  };

  return (
    <aside className="w-80 bg-dark-card border-r border-dark-border h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-dark-border">
        <button
          onClick={() => setActiveTab('blocks')}
          className={clsx(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'blocks'
              ? 'text-solana-purple border-b-2 border-solana-purple bg-dark-bg'
              : 'text-gray-400 hover:text-gray-300'
          )}
        >
          Blocks
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          className={clsx(
            'flex-1 px-4 py-3 text-sm font-medium transition-colors',
            activeTab === 'variables'
              ? 'text-solana-purple border-b-2 border-solana-purple bg-dark-bg'
              : 'text-gray-400 hover:text-gray-300'
          )}
        >
          Variables
        </button>
      </div>

      {activeTab === 'blocks' ? (
        <>
          <div className="p-4 border-b border-dark-border sticky top-0 bg-dark-card z-10">
            <div className="relative mb-3">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search blocks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
              />
            </div>

            {/* Category Filters */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                  categoryFilter === null
                    ? 'bg-solana-purple text-white'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:border-solana-purple hover:text-white'
                }`}
                title="All blocks"
              >
                <X size={12} />
                <span className="text-[10px]">All</span>
              </button>

              <button
                onClick={() => setCategoryFilter('trigger')}
                className={`px-2 py-1 rounded transition-all ${
                  categoryFilter === 'trigger'
                    ? 'bg-blue-500/20 border border-blue-500 text-blue-400'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:border-blue-500 hover:text-blue-400'
                }`}
                title="Triggers - Start workflow on events"
              >
                <Zap size={13} />
              </button>

              <button
                onClick={() => setCategoryFilter('action')}
                className={`px-2 py-1 rounded transition-all ${
                  categoryFilter === 'action'
                    ? 'bg-red-500/20 border border-red-500 text-red-400'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:border-red-500 hover:text-red-400'
                }`}
                title="Actions - Perform operations"
              >
                <Send size={13} />
              </button>

              <button
                onClick={() => setCategoryFilter('data')}
                className={`px-2 py-1 rounded transition-all ${
                  categoryFilter === 'data'
                    ? 'bg-green-500/20 border border-green-500 text-green-400'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:border-green-500 hover:text-green-400'
                }`}
                title="Data - Fetch and process data"
              >
                <Database size={13} />
              </button>

              <button
                onClick={() => setCategoryFilter('logic')}
                className={`px-2 py-1 rounded transition-all ${
                  categoryFilter === 'logic'
                    ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-400'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:border-yellow-500 hover:text-yellow-400'
                }`}
                title="Logic - Control flow and conditions"
              >
                <GitBranch size={13} />
              </button>

              <button
                onClick={() => setCategoryFilter('ai')}
                className={`px-2 py-1 rounded transition-all ${
                  categoryFilter === 'ai'
                    ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:border-purple-500 hover:text-purple-400'
                }`}
                title="AI - LLM and intelligent processing"
              >
                <Sparkles size={13} />
              </button>

              <button
                onClick={() => setCategoryFilter('telegram')}
                className={`px-2 py-1 rounded transition-all ${
                  categoryFilter === 'telegram'
                    ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                    : 'bg-dark-bg border border-dark-border text-gray-400 hover:border-cyan-500 hover:text-cyan-400'
                }`}
                title="Telegram - Bot actions and messaging"
              >
                <Send size={13} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
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
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <WorkflowVariables workflowId={workflowId} onSave={onSave} />
        </div>
      )}
    </aside>
  );
}
