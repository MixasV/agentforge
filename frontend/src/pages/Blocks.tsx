import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { api } from '@/services/api';
import { BlockDefinition } from '@/types';
import { Search, Database, Zap, GitBranch, Brain, Download, Star } from 'lucide-react';
import clsx from 'clsx';

const CATEGORY_ICONS = {
  trigger: Zap,
  data: Database,
  action: Zap,
  logic: GitBranch,
  ai: Brain,
};

const CATEGORY_COLORS = {
  trigger: 'text-green-400 bg-green-400/10 border-green-400/20',
  data: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  action: 'text-red-400 bg-red-400/10 border-red-400/20',
  logic: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  ai: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

export function Blocks() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
    const matchesCategory = !selectedCategory || block.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'trigger', name: 'Triggers', count: blocks.filter((b) => b.category === 'trigger').length },
    { id: 'data', name: 'Data Sources', count: blocks.filter((b) => b.category === 'data').length },
    { id: 'action', name: 'Actions', count: blocks.filter((b) => b.category === 'action').length },
    { id: 'logic', name: 'Logic', count: blocks.filter((b) => b.category === 'logic').length },
    { id: 'ai', name: 'AI', count: blocks.filter((b) => b.category === 'ai').length },
  ];

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Blocks Marketplace</h1>
          <p className="text-gray-400">
            Discover and use pre-built blocks for your workflows
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search blocks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={clsx(
                'px-4 py-2 rounded-lg border transition-colors',
                !selectedCategory
                  ? 'bg-solana-purple/10 border-solana-purple text-solana-purple'
                  : 'bg-dark-card border-dark-border text-gray-400 hover:border-solana-purple/50'
              )}
            >
              All ({blocks.length})
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={clsx(
                  'px-4 py-2 rounded-lg border transition-colors',
                  selectedCategory === category.id
                    ? 'bg-solana-purple/10 border-solana-purple text-solana-purple'
                    : 'bg-dark-card border-dark-border text-gray-400 hover:border-solana-purple/50'
                )}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>

        {/* Blocks Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading blocks...</div>
        ) : filteredBlocks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No blocks found</p>
            {search && <p className="text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlocks.map((block) => {
              const Icon = CATEGORY_ICONS[block.category];
              const colorClass = CATEGORY_COLORS[block.category];

              return (
                <div
                  key={block.type}
                  className="bg-dark-card rounded-xl p-6 border border-dark-border hover:border-solana-purple transition-colors"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={clsx('p-3 rounded-lg border', colorClass)}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{block.name}</h3>
                      <span className={clsx('text-xs px-2 py-0.5 rounded', colorClass)}>
                        {block.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                    {block.description}
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="bg-dark-bg rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Inputs</p>
                      <div className="flex flex-wrap gap-1">
                        {block.inputs.slice(0, 3).map((input, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-blue-400/10 text-blue-400 rounded"
                          >
                            {input.name}
                          </span>
                        ))}
                        {block.inputs.length > 3 && (
                          <span className="text-xs px-2 py-0.5 bg-dark-border text-gray-500 rounded">
                            +{block.inputs.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-dark-bg rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Outputs</p>
                      <div className="flex flex-wrap gap-1">
                        {block.outputs.slice(0, 3).map((output, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-green-400/10 text-green-400 rounded"
                          >
                            {output.name}
                          </span>
                        ))}
                        {block.outputs.length > 3 && (
                          <span className="text-xs px-2 py-0.5 bg-dark-border text-gray-500 rounded">
                            +{block.outputs.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Download size={14} />
                        Official
                      </span>
                      <span className="flex items-center gap-1">
                        <Star size={14} className="text-yellow-400" />
                        5.0
                      </span>
                    </div>
                    <span className="text-sm font-medium text-solana-green">
                      {block.creditsCost === 0 ? 'FREE' : `${block.creditsCost} credits`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Coming Soon Section */}
        <div className="mt-12 bg-dark-card rounded-xl p-8 border border-dark-border text-center">
          <h2 className="text-2xl font-bold mb-4">Community Marketplace Coming Soon</h2>
          <p className="text-gray-400 mb-6">
            Soon you'll be able to create and share your own custom blocks with the community.
            <br />
            Earn credits when others use your blocks!
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-bg rounded-lg">
              <span className="text-sm text-gray-400">Revenue Share:</span>
              <span className="text-sm font-semibold text-solana-green">70% to creators</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-bg rounded-lg">
              <span className="text-sm text-gray-400">Platform Fee:</span>
              <span className="text-sm font-semibold">30%</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
