import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import { BlockDefinition } from '@/types';

export function NodeInspector() {
  const { selectedNode, updateNode, removeNode, setSelectedNode } = useWorkflowStore();
  const [config, setConfig] = useState<Record<string, any>>({});

  const { data: blocksData } = useQuery({
    queryKey: ['blocks'],
    queryFn: async () => {
      const response = await api.get('/api/blocks');
      return response.data;
    },
  });

  const blocks: (BlockDefinition & { type: string })[] = blocksData?.data?.blocks || [];
  const currentBlockDef = blocks.find(b => b.type === selectedNode?.data?.type);

  useEffect(() => {
    if (selectedNode?.data?.config) {
      setConfig(selectedNode.data.config);
    } else {
      setConfig({});
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <aside className="w-96 bg-dark-card border-l border-dark-border h-screen p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <p className="text-gray-400">Select a node to configure</p>
        </div>
      </aside>
    );
  }

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    updateNode(selectedNode.id, {
      data: {
        ...selectedNode.data,
        config: newConfig,
      },
    });
  };

  const handleDelete = () => {
    removeNode(selectedNode.id);
    setSelectedNode(null);
  };

  const handleClose = () => {
    setSelectedNode(null);
  };

  return (
    <aside className="w-96 bg-dark-card border-l border-dark-border h-screen overflow-y-auto">
      <div className="sticky top-0 bg-dark-card border-b border-dark-border p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Node Configuration</h3>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={clsx(
                'p-3 rounded-lg',
                selectedNode.data.category === 'data' && 'bg-blue-400/10 text-blue-400',
                selectedNode.data.category === 'action' && 'bg-red-400/10 text-red-400',
                selectedNode.data.category === 'logic' && 'bg-yellow-400/10 text-yellow-400',
                selectedNode.data.category === 'ai' && 'bg-purple-400/10 text-purple-400'
              )}
            >
              {selectedNode.data.category === 'data' && '📊'}
              {selectedNode.data.category === 'action' && '⚡'}
              {selectedNode.data.category === 'logic' && '🔀'}
              {selectedNode.data.category === 'ai' && '🧠'}
            </div>
            <div>
              <h4 className="font-semibold">{selectedNode.data.label}</h4>
              <p className="text-sm text-gray-500">{selectedNode.data.type}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {currentBlockDef ? (
            currentBlockDef.inputs.map((input) => (
              <div key={input.name}>
                <label className="block text-sm font-medium mb-2">
                  {input.name}
                  {input.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {input.type === 'number' ? (
                  <input
                    type="number"
                    value={config[input.name] || ''}
                    onChange={(e) => handleConfigChange(input.name, parseFloat(e.target.value))}
                    placeholder={input.description}
                    required={input.required}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
                  />
                ) : input.type === 'boolean' ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config[input.name] || false}
                      onChange={(e) => handleConfigChange(input.name, e.target.checked)}
                      className="w-5 h-5 rounded bg-dark-bg border-dark-border text-solana-purple focus:ring-solana-purple"
                    />
                    <span className="text-sm text-gray-400">{input.description}</span>
                  </label>
                ) : input.type === 'array' ? (
                  <textarea
                    value={JSON.stringify(config[input.name] || [], null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleConfigChange(input.name, parsed);
                      } catch {
                        // Invalid JSON, don't update
                      }
                    }}
                    placeholder={input.description}
                    rows={4}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple font-mono text-xs"
                  />
                ) : input.type === 'object' ? (
                  <textarea
                    value={JSON.stringify(config[input.name] || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        handleConfigChange(input.name, parsed);
                      } catch {
                        // Invalid JSON, don't update
                      }
                    }}
                    placeholder={input.description}
                    rows={4}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple font-mono text-xs"
                  />
                ) : (
                  <input
                    type="text"
                    value={config[input.name] || ''}
                    onChange={(e) => handleConfigChange(input.name, e.target.value)}
                    placeholder={input.description}
                    required={input.required}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
                  />
                )}
                {input.description && (
                  <p className="text-xs text-gray-500 mt-1">{input.description}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No configuration available for this block</p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={18} />
            Delete Node
          </button>
        </div>

        <div className="mt-6 p-4 bg-dark-bg rounded-lg border border-dark-border">
          <h5 className="text-sm font-medium mb-2">Node Info</h5>
          <div className="space-y-1 text-xs text-gray-500">
            <p>ID: {selectedNode.id}</p>
            <p>Type: {selectedNode.data.type}</p>
            <p>Category: {selectedNode.data.category}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
