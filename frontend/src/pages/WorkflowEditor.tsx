import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas';
import { ActivationToggle } from '@/components/workflow/ActivationToggle';
import { PrepaymentModal } from '@/components/billing/PrepaymentModal';
import { useWorkflowStore } from '@/store/workflowStore';
import { useExecutionStream } from '@/hooks/useExecutionStream';
import { useCredits } from '@/hooks/useCredits';
import { Node, Edge } from 'reactflow';
import toast from 'react-hot-toast';
import { ArrowLeft, AlertTriangle, Wallet } from 'lucide-react';

export function WorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setNodes, setEdges, clearWorkflow } = useWorkflowStore();
  const { balance, refetchBalance } = useCredits();
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [isWaitingForTrigger, setIsWaitingForTrigger] = useState(false);
  const [showPrepaymentModal, setShowPrepaymentModal] = useState(false);
  
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
    // Check credits before running
    const currentBalance = balance?.balance || 0;
    if (currentBalance === 0) {
      toast.error('Insufficient credits! Please top up to run workflow.');
      setShowPrepaymentModal(true);
      return;
    }

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

  const currentBalance = balance?.balance || 0;
  const showLowBalanceWarning = currentBalance < 300 && currentBalance > 0;
  const showZeroBalanceBlock = currentBalance === 0;

  const handlePrepaymentSuccess = () => {
    refetchBalance();
    toast.success('Credits added! You can now run workflows.');
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
          isDisabled={balance?.balance === 0}
        />
      </div>

      {/* CRITICAL: Zero Balance Block */}
      {showZeroBalanceBlock && (
        <div className="bg-red-500/10 border-b-4 border-red-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={28} className="text-red-500" />
              <div>
                <div className="font-bold text-lg text-red-500">⛔ No Credits Available</div>
                <div className="text-sm text-red-400">
                  Workflow execution is blocked. Please top up your balance to continue.
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPrepaymentModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
            >
              <Wallet size={20} />
              Add Credits Now
            </button>
          </div>
        </div>
      )}

      {/* WARNING: Low Balance Warning */}
      {showLowBalanceWarning && (
        <div className="bg-yellow-500/10 border-b-2 border-yellow-500/50 px-6 py-3 cursor-pointer hover:bg-yellow-500/20 transition-colors"
          onClick={() => setShowPrepaymentModal(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} className="text-yellow-500" />
              <div>
                <div className="font-semibold text-yellow-500">
                  ⚠️ Low Credits Warning: {currentBalance.toLocaleString()} remaining
                </div>
                <div className="text-xs text-yellow-400">
                  Your balance is critically low. Click here to top up before it runs out.
                </div>
              </div>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-500 font-medium rounded-lg hover:bg-yellow-500/30 transition-colors"
            >
              <Wallet size={18} />
              Top Up
            </button>
          </div>
        </div>
      )}

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
        <WorkflowCanvas 
          workflowId={id} 
          onSave={handleSave} 
          onRun={handleRun}
          isRunDisabled={showZeroBalanceBlock}
        />
      </div>

      {/* Prepayment Modal */}
      <PrepaymentModal
        isOpen={showPrepaymentModal}
        onClose={() => setShowPrepaymentModal(false)}
        onSuccess={handlePrepaymentSuccess}
      />
    </div>
  );
}
