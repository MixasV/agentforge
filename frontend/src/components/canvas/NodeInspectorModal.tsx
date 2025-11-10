import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Trash2, X, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { BlockDefinition } from '@/types';
import toast from 'react-hot-toast';

export function NodeInspectorModal() {
  const { selectedNode, updateNode, removeNode, setSelectedNode } = useWorkflowStore();
  const [config, setConfig] = useState<Record<string, any>>({});
  const [copiedOutput, setCopiedOutput] = useState<string | null>(null);

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
    return null;
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
    if (window.confirm('Delete this block?')) {
      removeNode(selectedNode.id);
      setSelectedNode(null);
    }
  };

  const handleClose = () => {
    setSelectedNode(null);
  };

  const handleCopyOutput = (outputName: string) => {
    const reference = `{{${selectedNode?.id}.${outputName}}}`;
    navigator.clipboard.writeText(reference);
    setCopiedOutput(outputName);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedOutput(null), 2000);
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="bg-dark-card rounded-lg shadow-2xl border border-dark-border flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-4 border-b border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'p-3 rounded-lg',
                  selectedNode.data.category === 'trigger' && 'bg-green-400/10 text-green-400',
                  selectedNode.data.category === 'data' && 'bg-blue-400/10 text-blue-400',
                  selectedNode.data.category === 'action' && 'bg-red-400/10 text-red-400',
                  selectedNode.data.category === 'logic' && 'bg-yellow-400/10 text-yellow-400',
                  selectedNode.data.category === 'ai' && 'bg-purple-400/10 text-purple-400'
                )}
              >
                {selectedNode.data.category === 'trigger' && '⚡'}
                {selectedNode.data.category === 'data' && '📊'}
                {selectedNode.data.category === 'action' && '⚡'}
                {selectedNode.data.category === 'logic' && '🔀'}
                {selectedNode.data.category === 'ai' && '🧠'}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selectedNode.data.label}</h3>
                <p className="text-sm text-gray-500">{selectedNode.data.type}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Configuration */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-4 text-gray-400 uppercase">Configuration</h4>
              
              {currentBlockDef && currentBlockDef.inputs.length > 0 ? (
                <div className="space-y-4">
                  {currentBlockDef.inputs.map((input) => (
                    <div key={input.name}>
                      <label className="block text-sm font-medium mb-2">
                        {input.name}
                        {input.required && <span className="text-red-400 ml-1">*</span>}
                        {input.type === 'select' && config[input.name] && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({(input as any).options?.find((o: any) => o.value === config[input.name])?.label || config[input.name]})
                          </span>
                        )}
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
                      ) : input.type === 'select' ? (
                        <select
                          value={config[input.name] || (input as any).default || ''}
                          onChange={(e) => handleConfigChange(input.name, e.target.value)}
                          className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-solana-purple"
                        >
                          {(input as any).options?.map((option: any) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No configuration available for this block</p>
              )}
            </div>

            {/* Outputs */}
            {currentBlockDef && currentBlockDef.outputs.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-4 text-gray-400 uppercase">Outputs</h4>
                <div className="space-y-2">
                  {currentBlockDef.outputs.map((output) => (
                    <div
                      key={output.name}
                      className="p-3 bg-dark-bg rounded-lg border border-dark-border"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{output.name}</span>
                        <span className="text-xs text-gray-500 font-mono">{output.type}</span>
                      </div>
                      {output.description && (
                        <p className="text-xs text-gray-500 mb-2">{output.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 bg-dark-card rounded border border-dark-border">
                          <code className="text-xs text-solana-purple font-mono">
                            {`{{${selectedNode.id}.${output.name}}}`}
                          </code>
                        </div>
                        <button
                          onClick={() => handleCopyOutput(output.name)}
                          className={clsx(
                            'p-2 rounded-lg transition-colors',
                            copiedOutput === output.name
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-dark-card border border-dark-border hover:border-solana-purple text-gray-400 hover:text-solana-purple'
                          )}
                          title="Copy to clipboard"
                        >
                          {copiedOutput === output.name ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Node Info */}
            <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
              <h5 className="text-sm font-medium mb-2">Node Info</h5>
              <div className="space-y-1 text-xs text-gray-500">
                <p>ID: {selectedNode.id}</p>
                <p>Type: {selectedNode.data.type}</p>
                <p>Category: {selectedNode.data.category}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-dark-border flex items-center justify-between">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={16} />
              Delete Block
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-solana-purple text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
