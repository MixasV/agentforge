import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface LogEntry {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
  timestamp: Date;
  duration?: number;
}

export function ExecutionLog() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const getStatusIcon = (status: LogEntry['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      case 'running':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-600" />;
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
          {logs.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-solana-purple/10 text-solana-purple rounded">
              {logs.length} entries
            </span>
          )}
        </div>
        {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
      </button>

      {isExpanded && (
        <div className="h-52 overflow-y-auto px-6 pb-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No execution logs yet</p>
              <p className="text-xs mt-1">Run a workflow to see execution details</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 bg-dark-bg rounded-lg border border-dark-border"
                >
                  <div className="mt-0.5">{getStatusIcon(log.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{log.nodeName}</span>
                      <span className="text-xs text-gray-500">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {log.message && (
                      <p className="text-xs text-gray-400 mb-1">{log.message}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Node: {log.nodeId}</span>
                      {log.duration && <span>Duration: {log.duration}ms</span>}
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
