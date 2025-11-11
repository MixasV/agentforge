import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Eye, EyeOff, AlertTriangle, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';

interface BlockVariable {
  id?: string; // Variable ID from database
  name: string;
  type: string;
  isConfig: boolean; // true if configuration (botToken), false if runtime data (chatId)
  usedInBlocks: Array<{ id: string; name: string }>;
  value?: string;
  isSecret?: boolean;
  isLocked?: boolean; // true if locked (cannot be changed/deleted)
  hasIncomingConnection?: boolean; // true if receives data from previous block
}

interface WorkflowVariablesProps {
  workflowId?: string;
  onSave?: () => void;
}

export function WorkflowVariables({ workflowId }: WorkflowVariablesProps) {
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

  // Load saved variables from database
  const { data: savedVariablesData, refetch: refetchVariables } = useQuery({
    queryKey: ['workflowVariables', workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const response = await api.get(`/api/workflows/${workflowId}/variables`);
      return response.data;
    },
    enabled: !!workflowId,
  });

  const blocks = blocksData?.data?.blocks || [];
  const savedVariables = savedVariablesData?.data?.variables || [];

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

  // Extract all variables from blocks on canvas + merge with saved locked variables
  const extractedVariables = (): BlockVariable[] => {
    const varMap = new Map<string, BlockVariable>();

    // First, add all LOCKED variables from database (always show them)
    savedVariables.forEach((saved: any) => {
      if (saved.isLocked) {
        varMap.set(saved.key, {
          id: saved.id,
          name: saved.key,
          type: 'string',
          isConfig: true,
          isSecret: saved.isSecret,
          isLocked: saved.isLocked,
          hasIncomingConnection: false,
          usedInBlocks: [],
          value: saved.value === '********' ? '' : saved.value, // Don't show masked value
        });
      }
    });

    // Then, add variables from blocks on canvas
    nodes.forEach(node => {
      const blockDef = blocks.find((b: any) => b.type === node.data.type);
      if (!blockDef) return;

      const nodeHasIncoming = hasIncomingData(node.id);

      blockDef.inputs.forEach((input: any) => {
        const varName = input.name;
        const isConfig = isConfigVariable(varName);
        
        if (!isConfig) return; // Skip runtime data

        const existing = varMap.get(varName);
        const savedVar = savedVariables.find((v: any) => v.key === varName);

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
          // IMPORTANT: For locked variables, ALWAYS use value from database, NOT from canvas config
          const configValue = node.data.config?.[varName];
          const dbValue = savedVar?.value === '********' ? '' : savedVar?.value;
          const finalValue = (savedVar?.isLocked && dbValue) ? dbValue : (configValue || dbValue || '');
          
          varMap.set(varName, {
            id: savedVar?.id,
            name: varName,
            type: input.type,
            isConfig: isConfig,
            isSecret: savedVar?.isSecret || isConfig,
            isLocked: savedVar?.isLocked || false,
            hasIncomingConnection: nodeHasIncoming,
            usedInBlocks: [{
              id: node.id,
              name: node.data.label || blockDef.name,
            }],
            value: finalValue,
          });
        }
      });
    });

    return Array.from(varMap.values())
      .sort((a, b) => {
        // Sort: locked first, then by name
        if (a.isLocked && !b.isLocked) return -1;
        if (!a.isLocked && b.isLocked) return 1;
        return a.name.localeCompare(b.name);
      });
  };

  const allVariables = extractedVariables();

  // Initialize variables state with saved values on mount and when saved variables change
  useEffect(() => {
    const initialValues: Record<string, string> = {};
    allVariables.forEach(v => {
      if (v.value) {
        initialValues[v.name] = v.value;
      }
    });
    setVariables(initialValues);
  }, [savedVariablesData]); // Re-run when saved variables change

  const handleValueChange = (varName: string, value: string) => {
    setVariables(prev => ({ ...prev, [varName]: value }));
  };

  const handleToggleLock = async (variable: BlockVariable) => {
    if (!variable.id) {
      toast.error('Save the variable first before locking');
      return;
    }

    try {
      await api.patch(`/api/workflows/${workflowId}/variables/${variable.id}/lock`, {
        isLocked: !variable.isLocked,
      });
      toast.success(variable.isLocked ? '🔓 Variable unlocked' : '🔒 Variable locked');
      refetchVariables();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle lock');
    }
  };

  const handleApplyToAll = async (varName: string) => {
    const value = variables[varName];
    if (!value) {
      toast.error('Enter a value first');
      return;
    }

    // Prevent saving {{env.xxx}} or {{node.xxx}} as variable values
    if (value.includes('{{') && value.includes('}}')) {
      toast.error('Variables must contain REAL VALUES, not references like {{env.XXX}}. Enter the actual token/key value.');
      return;
    }

    const variable = allVariables.find(v => v.name === varName);
    if (!variable) return;

    // Prevent changing locked variables
    if (variable.isLocked && variable.value && variable.value !== value) {
      toast.error('🔒 This variable is locked. Unlock it first to change the value.');
      return;
    }

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

      // 1.5. If this is TELEGRAM_BOT_TOKEN, also save to user settings
      if (varName === 'TELEGRAM_BOT_TOKEN' || varName === 'botToken') {
        try {
          await api.post('/api/settings/telegram', {
            botToken: value,
          });
          toast.success('✅ Bot token also saved to Settings!');
        } catch (err) {
          console.warn('Failed to save bot token to Settings:', err);
        }
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
      
      // 4. DON'T auto-save workflow to prevent race conditions with locked variables
      // User will save manually via Save button

      toast.success(`✅ Saved to database & applied to ${variable.usedInBlocks.length} blocks. Click Save to persist.`);
      refetchVariables(); // Reload to get variable ID for locking
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
          💡 Enter REAL VALUES here (not {`{{env.XXX}}`})
        </p>
        <p className="text-xs text-blue-400 mt-1">
          Example: botToken = 123456789:ABCdef... (actual token)
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Runtime data (chatId, message) passes automatically between blocks
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
                {variable.isLocked && (
                  <span className="text-xs px-1 py-0.5 bg-green-500/20 text-green-400 rounded">
                    🔒 Locked
                  </span>
                )}
                {variable.isSecret && (
                  <span className="text-xs px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                    🔐 Secret
                  </span>
                )}
              </div>

              {/* Value input */}
              <div className="flex items-center gap-1 mb-2">
                <input
                  type={variable.isSecret && !showValues[variable.name] ? 'password' : 'text'}
                  placeholder={variable.value || 'Enter value...'}
                  value={variables[variable.name] !== undefined ? variables[variable.name] : (variable.value || '')}
                  onChange={(e) => handleValueChange(variable.name, e.target.value)}
                  disabled={variable.isLocked && !!variable.value}
                  className={`flex-1 px-2 py-1 text-xs bg-dark-card border border-dark-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple ${
                    variable.isLocked && variable.value ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
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
                {variable.id && (
                  <button
                    onClick={() => handleToggleLock(variable)}
                    className="p-1 hover:bg-dark-card rounded transition-colors"
                    title={variable.isLocked ? 'Unlock variable' : 'Lock variable'}
                  >
                    {variable.isLocked ? (
                      <Lock size={12} className="text-green-400" />
                    ) : (
                      <Unlock size={12} className="text-gray-400" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleApplyToAll(variable.name)}
                  disabled={variable.isLocked && !!variable.value}
                  className={`px-2 py-1 text-xs bg-solana-purple text-white rounded hover:bg-solana-purple/80 transition-colors ${
                    variable.isLocked && variable.value ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
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
              {variable.usedInBlocks.length > 0 ? (
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
              ) : variable.isLocked ? (
                <div className="text-xs text-gray-500">
                  <span className="font-medium">🔒 Locked variable</span>
                  <p className="text-xs text-gray-600 mt-1">Always available, even without blocks</p>
                </div>
              ) : (
                <div className="text-xs text-gray-600">
                  <span>No blocks using this variable yet</span>
                </div>
              )}

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
