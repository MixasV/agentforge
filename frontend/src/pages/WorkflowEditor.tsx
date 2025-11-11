import { useState, useEffect } from 'react';
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
  const [isWaitingForTrigger, setIsWaitingForTrigger] = useState(false);
  
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

  // Removed runMutation - using async/await two-step flow now

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

  const handleRun = async () => {
    // Check if workflow has Telegram Trigger
    const canvas = workflowData?.data?.canvasJson ? JSON.parse(workflowData.data.canvasJson) : { nodes: [] };
    const hasTelegramTrigger = canvas.nodes?.some((node: any) => 
      node.data?.type === 'telegram_trigger' || node.type === 'telegram_trigger'
    );
    
    if (hasTelegramTrigger) {
      setIsWaitingForTrigger(true);
      toast.loading('⏳ Waiting for Telegram message... Send a message to your bot!', {
        duration: 10000,
        id: 'telegram-wait',
      });
    }

    try {
      // STEP 1: Create execution record and get executionId
      const createResponse = await api.post(`/api/workflows/${id}/executions/create`);
      const executionId = createResponse.data?.data?.executionId;
      
      if (!executionId) {
        throw new Error('Failed to create execution');
      }

      console.log('[WorkflowEditor] Execution created:', executionId);

      // STEP 2: Connect to SSE FIRST
      setCurrentExecutionId(executionId);
      
      // STEP 3: Wait a bit for SSE to establish connection
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('[WorkflowEditor] SSE connected, starting workflow execution...');

      // STEP 4: Start actual workflow execution
      await api.post(`/api/workflows/${id}/executions/${executionId}/start`);
      
      if (!hasTelegramTrigger) {
        toast.success('Workflow execution started');
      }

      setTimeout(() => {
        setIsWaitingForTrigger(false);
        toast.dismiss('telegram-wait');
      }, 2000);
      
    } catch (error: any) {
      console.error('Workflow execution failed:', error);
      setIsWaitingForTrigger(false);
      toast.dismiss('telegram-wait');
      toast.error(error.response?.data?.error || 'Workflow execution failed');
    }
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

      <div className="flex-1 overflow-hidden relative">
        {isWaitingForTrigger && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
            <div>
              <div className="font-semibold">Waiting for Telegram message...</div>
              <div className="text-xs opacity-90">Send a message to your bot to execute workflow</div>
            </div>
          </div>
        )}
        <WorkflowCanvas workflowId={id} onSave={handleSave} onRun={handleRun} />
      </div>
    </div>
  );
}
