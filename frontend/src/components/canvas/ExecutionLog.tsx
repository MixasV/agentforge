import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useParams } from 'react-router-dom';

interface Execution {
  id: string;
  status: 'running' | 'success' | 'failed';
  errorMessage?: string;
  executionTimeMs?: number;
  createdAt: string;
}

export function ExecutionLog() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { id: workflowId } = useParams();

  const { data: executionsData, refetch } = useQuery({
    queryKey: ['executions', workflowId],
    queryFn: async () => {
      if (!workflowId) return { executions: [] };
      const response = await api.get(`/api/workflows/${workflowId}/executions?limit=20`);
      return response.data;
    },
    enabled: !!workflowId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const executions: Execution[] = executionsData?.data?.executions || [];

  // Trigger refetch when expanded
  useEffect(() => {
    if (isExpanded) {
      refetch();
    }
  }, [isExpanded, refetch]);

  const getStatusIcon = (status: Execution['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      case 'running':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: Execution['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-400/10 text-green-400 border-green-400/20';
      case 'failed':
        return 'bg-red-400/10 text-red-400 border-red-400/20';
      case 'running':
        return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
    }
  };

  return (
    <div
      className={clsx(
        'bg-dark-card border-t border-dark-border transition-all',
        isExpanded ? 'h-64' : 'h-12'
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-12 px-6 flex items-center justify-between hover:bg-dark-bg/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Execution Log</h3>
          {executions.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-solana-purple/10 text-solana-purple rounded">
              {executions.length} runs
            </span>
          )}
        </div>
        {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </button>

      {isExpanded && (
        <div className="h-52 overflow-y-auto px-6 pb-4">
          {executions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No execution logs yet</p>
              <p className="text-xs mt-1">Run a workflow to see execution details</p>
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-start gap-3 p-3 bg-dark-bg rounded-lg border border-dark-border"
                >
                  <div className="mt-0.5">{getStatusIcon(execution.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded border font-medium uppercase',
                          getStatusColor(execution.status)
                        )}>
                          {execution.status}
                        </span>
                        {execution.executionTimeMs && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={12} />
                            {execution.executionTimeMs}ms
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(execution.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {execution.errorMessage && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                        <p className="text-xs text-red-400">{execution.errorMessage}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>ID: {execution.id.substring(0, 8)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
