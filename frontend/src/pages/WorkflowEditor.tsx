import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas';
import { ActivationToggle } from '@/components/workflow/ActivationToggle';
import { useWorkflowStore } from '@/store/workflowStore';
import { useExecutionStream } from '@/hooks/useExecutionStream';
import { Node, Edge } from 'reactflow';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

export function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setNodes, setEdges, clearWorkflow } = useWorkflowStore();
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  
  // Connect to execution stream for real-time updates
  useExecutionStream(id || '', currentExecutionId);

  const { data: workflowData, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      const response = await api.get(`/api/workflows/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { nodes: Node[]; edges: Edge[] }) => {
      const canvasJson = JSON.stringify({
        nodes: data.nodes,
        edges: data.edges,
      });
      const response = await api.put(`/api/workflows/${id}`, { canvasJson });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Workflow saved successfully');
    },
    onError: () => {
      toast.error('Failed to save workflow');
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/workflows/${id}/run`, {
        inputs: {},
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Workflow executed successfully');
      console.log('Execution result:', data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Workflow execution failed';
      toast.error(message);
    },
  });

  useEffect(() => {
    if (workflowData?.data?.canvasJson) {
      try {
        const canvas = JSON.parse(workflowData.data.canvasJson);
        setNodes(canvas.nodes || []);
        setEdges(canvas.edges || []);
      } catch (error) {
        console.error('Failed to parse canvas JSON:', error);
        toast.error('Failed to load workflow');
      }
    }

    return () => {
      clearWorkflow();
    };
  }, [workflowData, setNodes, setEdges, clearWorkflow]);

  const handleSave = (nodes: Node[], edges: Edge[]) => {
    saveMutation.mutate({ nodes, edges });
  };

  const handleRun = () => {
    runMutation.mutate(undefined, {
      onSuccess: (data: any) => {
        // Set execution ID to start SSE stream
        if (data?.data?.executionId) {
          setCurrentExecutionId(data.data.executionId);
          console.log('[WorkflowEditor] Execution started:', data.data.executionId);
        }
        toast.success('Workflow execution started');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-solana-purple border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg overflow-hidden">
      <div className="h-14 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workflows')}
            className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-semibold">{workflowData?.data?.name || 'Workflow'}</h1>
            <p className="text-xs text-gray-500">ID: {id}</p>
          </div>
        </div>

        <ActivationToggle 
          workflowId={id!}
          initialActive={workflowData?.data?.isActive || false}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas workflowId={id} onSave={handleSave} onRun={handleRun} />
      </div>
    </div>
  );
}
