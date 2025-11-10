import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkflowVariable {
  id: string;
  key: string;
  value: string;
  description?: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EnvironmentVariablesProps {
  workflowId: string;
}

export function EnvironmentVariables({ workflowId }: EnvironmentVariablesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newVar, setNewVar] = useState({ key: '', value: '', description: '', isSecret: false });
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const queryClient = useQueryClient();

  const { data: variablesData } = useQuery({
    queryKey: ['workflow-variables', workflowId],
    queryFn: async () => {
      const response = await api.get(`/api/workflows/${workflowId}/variables`);
      return response.data;
    },
    enabled: !!workflowId,
  });

  const variables: WorkflowVariable[] = variablesData?.data?.variables || [];

  const saveMutation = useMutation({
    mutationFn: async (variable: typeof newVar) => {
      const response = await api.post(`/api/workflows/${workflowId}/variables`, variable);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-variables', workflowId] });
      toast.success('Variable saved!');
      setIsAdding(false);
      setNewVar({ key: '', value: '', description: '', isSecret: false });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save variable');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (variableId: string) => {
      await api.delete(`/api/workflows/${workflowId}/variables/${variableId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-variables', workflowId] });
      toast.success('Variable deleted');
    },
    onError: () => {
      toast.error('Failed to delete variable');
    },
  });

  const handleSave = () => {
    if (!newVar.key || !newVar.value) {
      toast.error('Key and value are required');
      return;
    }
    saveMutation.mutate(newVar);
  };

  const toggleShowValue = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Variables</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 px-2 py-1 bg-solana-purple text-white rounded text-xs hover:bg-solana-purple/80 transition-colors"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mb-3">
        <p className="text-xs text-blue-300">
          💡 Use <code className="text-solana-purple">{'{{env.NAME}}'}</code> in blocks
        </p>
      </div>

      {/* Compact Add Form */}
      {isAdding && (
        <div className="bg-dark-bg border border-dark-border rounded p-3 mb-3">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="VARIABLE_NAME"
              value={newVar.key}
              onChange={(e) => setNewVar({ ...newVar, key: e.target.value.toUpperCase() })}
              className="w-full px-2 py-1.5 text-xs bg-dark-card border border-dark-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
            />

            <input
              type={newVar.isSecret ? 'password' : 'text'}
              placeholder="Value..."
              value={newVar.value}
              onChange={(e) => setNewVar({ ...newVar, value: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-dark-card border border-dark-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
            />

            <input
              type="text"
              placeholder="Description (optional)"
              value={newVar.description}
              onChange={(e) => setNewVar({ ...newVar, description: e.target.value })}
              className="w-full px-2 py-1.5 text-xs bg-dark-card border border-dark-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isSecret"
                checked={newVar.isSecret}
                onChange={(e) => setNewVar({ ...newVar, isSecret: e.target.checked })}
                className="w-3 h-3"
              />
              <label htmlFor="isSecret" className="text-xs">
                Secret
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1 px-2 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewVar({ key: '', value: '', description: '', isSecret: false });
                }}
                className="px-2 py-1.5 text-xs bg-dark-bg border border-dark-border rounded hover:bg-dark-card transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variables List */}
      {variables.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No variables yet</p>
          <p className="text-xs mt-1">Click "Add" button above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {variables.map((variable) => (
            <div
              key={variable.id}
              className="bg-dark-bg border border-dark-border rounded p-2"
            >
              <div className="flex items-center justify-between mb-1">
                <code className="text-xs font-mono text-solana-purple">{variable.key}</code>
                <div className="flex items-center gap-1">
                  {variable.isSecret && (
                    <span className="text-xs px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                      🔒
                    </span>
                  )}
                  {variable.isSecret && (
                    <button
                      onClick={() => toggleShowValue(variable.id)}
                      className="p-1 hover:bg-dark-card rounded transition-colors"
                      title={showValues[variable.id] ? 'Hide' : 'Show'}
                    >
                      {showValues[variable.id] ? (
                        <EyeOff size={12} className="text-gray-400" />
                      ) : (
                        <Eye size={12} className="text-gray-400" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(variable.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="bg-dark-card border border-dark-border rounded px-2 py-1 mb-1">
                <code className="text-xs font-mono text-gray-300 break-all">
                  {variable.isSecret && !showValues[variable.id]
                    ? '••••••••'
                    : variable.value}
                </code>
              </div>

              {variable.description && (
                <p className="text-xs text-gray-500 mb-1">{variable.description}</p>
              )}

              <div className="text-xs text-gray-600">
                <code className="text-solana-purple">{'{{env.' + variable.key + '}}'}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
