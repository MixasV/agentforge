import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Plus, Play, Edit, Trash2, Calendar } from 'lucide-react';
import { api } from '@/services/api';
import { Workflow } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function Workflows() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');

  const { data: workflowsData, isLoading, refetch } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await api.get('/api/workflows');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await api.post('/api/workflows', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Workflow created');
      setShowCreateModal(false);
      setNewWorkflowName('');
      setNewWorkflowDesc('');
      refetch();
      navigate(`/workflows/${data.data.id}/edit`);
    },
    onError: () => {
      toast.error('Failed to create workflow');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/workflows/${id}`);
    },
    onSuccess: () => {
      toast.success('Workflow deleted');
      refetch();
    },
    onError: () => {
      toast.error('Failed to delete workflow');
    },
  });

  const workflows: Workflow[] = workflowsData?.data?.workflows || [];

  const handleCreate = () => {
    if (!newWorkflowName.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }
    createMutation.mutate({
      name: newWorkflowName,
      description: newWorkflowDesc || undefined,
    });
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Workflows</h1>
            <p className="text-gray-400">Create and manage your automation workflows</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={20} />
            New Workflow
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading workflows...</div>
        ) : workflows.length === 0 ? (
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-400 mb-6">No workflows yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Create Your First Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="bg-dark-card rounded-xl p-6 border border-dark-border hover:border-solana-purple transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold">{workflow.name}</h3>
                  {workflow.isActive && (
                    <span className="px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded">
                      Active
                    </span>
                  )}
                </div>

                {workflow.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {workflow.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {format(new Date(workflow.createdAt), 'MMM dd, yyyy')}
                  </div>
                  {workflow.lastExecutedAt && (
                    <div>Last run: {format(new Date(workflow.lastExecutedAt), 'HH:mm')}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/workflows/${workflow.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-solana-purple/10 text-solana-purple rounded-lg hover:bg-solana-purple/20 transition-colors"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(workflow.id)}
                    className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-card rounded-xl p-6 w-full max-w-md border border-dark-border">
              <h2 className="text-xl font-semibold mb-4">Create New Workflow</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Workflow Name</label>
                  <input
                    type="text"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="e.g., Token Swap Bot"
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <textarea
                    value={newWorkflowDesc}
                    onChange={(e) => setNewWorkflowDesc(e.target.value)}
                    placeholder="Describe what this workflow does..."
                    rows={3}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewWorkflowName('');
                    setNewWorkflowDesc('');
                  }}
                  className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border text-white rounded-lg hover:border-solana-purple transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
