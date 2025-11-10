import { useEffect, useRef } from 'react';
import { useWorkflowStore } from '../store/workflowStore';

interface ExecutionEvent {
  type: 'connected' | 'nodeStarted' | 'nodeCompleted' | 'nodeFailed';
  executionId?: string;
  nodeId?: string;
  nodeType?: string;
  timestamp?: string;
  output?: any;
  error?: string;
  duration?: number;
}

export function useExecutionStream(workflowId: string, executionId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const setNodeExecutionState = useWorkflowStore((state) => state.setNodeExecutionState);
  const clearExecutionStates = useWorkflowStore((state) => state.clearExecutionStates);

  useEffect(() => {
    if (!executionId) {
      return;
    }

    console.log('[ExecutionStream] Connecting...', { workflowId, executionId });

    // Clear previous states
    clearExecutionStates();

    // Create EventSource for SSE
    const url = `/api/workflows/${workflowId}/executions/${executionId}/stream`;
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[ExecutionStream] Connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ExecutionEvent = JSON.parse(event.data);
        console.log('[ExecutionStream] Event received:', data);

        switch (data.type) {
          case 'connected':
            console.log('[ExecutionStream] Connection confirmed');
            break;

          case 'nodeStarted':
            if (data.nodeId) {
              setNodeExecutionState(data.nodeId, 'executing');
            }
            break;

          case 'nodeCompleted':
            if (data.nodeId) {
              setNodeExecutionState(data.nodeId, 'success');
            }
            break;

          case 'nodeFailed':
            if (data.nodeId) {
              setNodeExecutionState(data.nodeId, 'error');
            }
            break;
        }
      } catch (error) {
        console.error('[ExecutionStream] Failed to parse event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[ExecutionStream] Error:', error);
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      console.log('[ExecutionStream] Disconnecting...');
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [workflowId, executionId, setNodeExecutionState, clearExecutionStates]);

  return {
    isConnected: !!eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN,
  };
}
