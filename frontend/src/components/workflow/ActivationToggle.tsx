import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Power, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ActivationToggleProps {
  workflowId: string;
  initialActive?: boolean;
  onStatusChange?: (isActive: boolean) => void;
  isDisabled?: boolean;
}

export function ActivationToggle({ 
  workflowId, 
  initialActive = false,
  onStatusChange,
  isDisabled = false
}: ActivationToggleProps) {
  const [isActive, setIsActive] = useState(initialActive);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsActive(initialActive);
  }, [initialActive]);

  const handleToggle = async () => {
    if (isDisabled) {
      toast.error('Insufficient credits! Please add credits to activate workflow.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isActive) {
        const response = await api.post(`/api/workflows/${workflowId}/deactivate`);
        
        if (response.data.success) {
          setIsActive(false);
          toast.success('Workflow deactivated');
          onStatusChange?.(false);
        }
      } else {
        const response = await api.post(`/api/workflows/${workflowId}/activate`);
        
        if (response.data.success) {
          setIsActive(true);
          toast.success(
            `Workflow activated with ${response.data.data.triggersRegistered} trigger(s)`
          );
          onStatusChange?.(true);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to toggle workflow';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleToggle}
        disabled={isLoading || isDisabled}
        title={isDisabled ? "Insufficient credits - please top up" : undefined}
        className={`
          relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
          ${isActive 
            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30' 
            : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border border-gray-500/30'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>{isActive ? 'Deactivating...' : 'Activating...'}</span>
          </>
        ) : (
          <>
            <Power size={18} />
            <span>{isActive ? 'Active' : 'Inactive'}</span>
          </>
        )}
      </button>

      {isActive && !isLoading && (
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle size={16} className="text-green-400" />
          <span className="text-sm text-green-400">Listening for events</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle size={16} className="text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}
    </div>
  );
}
