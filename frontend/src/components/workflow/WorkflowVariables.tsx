import { useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface BlockVariable {
  name: string;
  type: string;
  isConfig: boolean; // true if configuration (botToken), false if runtime data (chatId)
  usedInBlocks: Array<{ id: string; name: string }>;
  value?: string;
  isSecret?: boolean;
  hasIncomingConnection?: boolean; // true if receives data from previous block
}

interface WorkflowVariablesProps {
  workflowId?: string;
  onSave?: () => void;
}

export function WorkflowVariables({ workflowId, onSave }: WorkflowVariablesProps) {
  const { nodes, edges } = useWorkflowStore();
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [variables, setVariables] = useState<Record<string, string>>({});

  const { data: blocksData } = useQuery({
    queryKey: ['blocks'],
    queryFn: async () => {
      const response = await api.get('/api/blocks');
      return response.data;
    },
  });

  const blocks = blocksData?.data?.blocks || [];

  // Check if node has incoming connection for this variable
  const hasIncomingData = (nodeId: string): boolean => {
    return edges.some(edge => edge.target === nodeId);
  };

  // Determine if variable is configuration or runtime data
  const isConfigVariable = (varName: string): boolean => {
    const configKeywords = ['token', 'key', 'secret', 'password', 'apikey', 'api_key'];
    const lowerName = varName.toLowerCase();
    return configKeywords.some(keyword => lowerName.includes(keyword));
  };

  // Extract all variables from blocks on canvas
  const extractedVariables = (): BlockVariable[] => {
    const varMap = new Map<string, BlockVariable>();

    nodes.forEach(node => {
      const blockDef = blocks.find((b: any) => b.type === node.data.type);
      if (!blockDef) return;

      const nodeHasIncoming = hasIncomingData(node.id);

      blockDef.inputs.forEach((input: any) => {
        const varName = input.name;
        const isConfig = isConfigVariable(varName);
        const existing = varMap.get(varName);

        if (existing) {
          // Add this block to usage list
          existing.usedInBlocks.push({
            id: node.id,
            name: node.data.label || blockDef.name,
          });
          if (nodeHasIncoming) {
            existing.hasIncomingConnection = true;
          }
        } else {
          // Create new variable entry
          varMap.set(varName, {
            name: varName,
            type: input.type,
            isConfig: isConfig,
            isSecret: isConfig, // Secrets are config variables
            hasIncomingConnection: nodeHasIncoming,
            usedInBlocks: [{
              id: node.id,
              name: node.data.label || blockDef.name,
            }],
            value: node.data.config?.[varName] || '',
          });
        }
      });
    });

    return Array.from(varMap.values())
      .filter(v => v.isConfig) // Only show configuration variables
      .sort((a, b) => {
        // Sort by name
        return a.name.localeCompare(b.name);
      });
  };

  const allVariables = extractedVariables();

  const handleValueChange = (varName: string, value: string) => {
    setVariables(prev => ({ ...prev, [varName]: value }));
  };

  const handleApplyToAll = async (varName: string) => {
    const value = variables[varName];
    if (!value) {
      toast.error('Enter a value first');
      return;
    }

    const variable = allVariables.find(v => v.name === varName);
    if (!variable) return;

    try {
      // 1. Save variable to database first
      if (workflowId) {
        await api.post(`/api/workflows/${workflowId}/variables`, {
          key: varName,
          value: value,
          isSecret: variable.isSecret || false,
          description: `Used in ${variable.usedInBlocks.length} blocks`,
        });
      }

      // 2. Update all blocks that use this variable
      const { setNodes } = useWorkflowStore.getState();
      const updatedNodes = nodes.map(node => {
        const usesVar = variable.usedInBlocks.some(b => b.id === node.id);
        if (usesVar) {
          return {
            ...node,
            data: {
              ...node.data,
              config: {
                ...node.data.config,
                [varName]: value,
              },
            },
          };
        }
        return node;
      });

      // 3. Update nodes
      setNodes(updatedNodes);
      
      // 4. Save workflow canvas
      if (onSave) {
        setTimeout(() => {
          onSave();
        }, 200);
      }

      toast.success(`✅ Saved & applied to ${variable.usedInBlocks.length} blocks`);
    } catch (error: any) {
      console.error('Failed to save variable:', error);
      toast.error(error.response?.data?.error || 'Failed to save variable');
    }
  };

  const toggleShowValue = (varName: string) => {
    setShowValues(prev => ({ ...prev, [varName]: !prev[varName] }));
  };

  if (!workflowId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-xs">Workflow not loaded</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold mb-1">Variables</h3>
        <p className="text-xs text-gray-500">
          Fill once, apply to all blocks
        </p>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mb-3">
        <p className="text-xs text-blue-300">
          💡 Configuration only (tokens, keys)
        </p>
        <p className="text-xs text-blue-400 mt-1">
          Runtime data (chatId, message) passes automatically
        </p>
      </div>

      {/* Variables List */}
      {allVariables.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No variables yet</p>
          <p className="text-xs mt-1">Add blocks to canvas first</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allVariables.map((variable) => (
            <div
              key={variable.name}
              className="bg-dark-bg border border-dark-border rounded p-2"
            >
              {/* Variable name and badges */}
              <div className="flex items-center gap-1 mb-2">
                <code className="text-xs font-mono text-solana-purple flex-1">
                  {variable.name}
                </code>
                {variable.isSecret && (
                  <span className="text-xs px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                    🔒 Secret
                  </span>
                )}
              </div>

              {/* Value input */}
              <div className="flex items-center gap-1 mb-2">
                <input
                  type={variable.isSecret && !showValues[variable.name] ? 'password' : 'text'}
                  placeholder={variable.value || 'Enter value...'}
                  value={variables[variable.name] || ''}
                  onChange={(e) => handleValueChange(variable.name, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs bg-dark-card border border-dark-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
                />
                {variable.isSecret && (
                  <button
                    onClick={() => toggleShowValue(variable.name)}
                    className="p-1 hover:bg-dark-card rounded transition-colors"
                    title={showValues[variable.name] ? 'Hide' : 'Show'}
                  >
                    {showValues[variable.name] ? (
                      <EyeOff size={12} className="text-gray-400" />
                    ) : (
                      <Eye size={12} className="text-gray-400" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleApplyToAll(variable.name)}
                  className="px-2 py-1 text-xs bg-solana-purple text-white rounded hover:bg-solana-purple/80 transition-colors"
                >
                  Apply
                </button>
              </div>

              {/* Current value display */}
              {variable.value && (
                <div className="bg-dark-card border border-dark-border rounded px-2 py-1 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Current:</span>
                    <code className="text-xs font-mono text-gray-400">
                      {variable.isSecret && !showValues[variable.name] 
                        ? '••••••••' 
                        : variable.value.substring(0, 20) + (variable.value.length > 20 ? '...' : '')}
                    </code>
                  </div>
                </div>
              )}

              {/* Used in blocks */}
              <div className="text-xs text-gray-500">
                <span className="font-medium">Used in:</span>
                <div className="mt-1 space-y-1">
                  {variable.usedInBlocks.map((block, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                      <span className="truncate">{block.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning if empty */}
              {!variable.value && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle size={12} />
                  <span>Needs configuration</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
