import { useState, type Dispatch, type SetStateAction } from 'react';
import { X, Sparkles, Send, Check, XCircle, History } from 'lucide-react';
import { api } from '@/services/api';
import clsx from 'clsx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  workflow?: {
    nodes: any[];
    edges: any[];
  };
  explanation?: string;
  securityNotes?: string[];
  commandExamples?: string[];
  nextSteps?: string[];
  timestamp: string;
}

interface WorkflowVersion {
  id: string;
  timestamp: string;
  message: string;
  workflow: {
    nodes: any[];
    edges: any[];
  };
}

interface AIAssistantPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  currentWorkflow: { nodes: any[]; edges: any[] };
  onApplyWorkflow: (workflow: { nodes: any[]; edges: any[] }) => void;
  onPreviewWorkflow: (workflow: { nodes: any[]; edges: any[] } | null) => void;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  versions: WorkflowVersion[];
  setVersions: Dispatch<SetStateAction<WorkflowVersion[]>>;
  historyKey?: string;
  versionsKey?: string;
}

export function AIAssistantPanel({
  isExpanded,
  onToggle,
  currentWorkflow,
  onApplyWorkflow,
  onPreviewWorkflow,
  messages,
  setMessages,
  versions,
  setVersions,
  historyKey = 'ai-assistant-history',
  versionsKey = 'ai-assistant-versions',
}: AIAssistantPanelProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingWorkflow, setPendingWorkflow] = useState<any>(null);

  const persistMessages = (list: Message[]) => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(list));
    } catch (err) {
      try {
        const compact = list.slice(-30).map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }));
        localStorage.setItem(historyKey, JSON.stringify(compact));
      } catch {
        void 0;
      }
    }
  };

  const persistVersions = (list: WorkflowVersion[]) => {
    try {
      localStorage.setItem(versionsKey, JSON.stringify(list.slice(0, 10)));
    } catch {
      try { localStorage.setItem(versionsKey, JSON.stringify([])); } catch { void 0; }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const next = [...messages, userMessage];
    setMessages(next);
    persistMessages(next);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await api.post('/api/ai/ai-assist', {
        message: input,
        currentWorkflow,
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      const { data } = response.data;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        workflow: data.workflow,
        explanation: data.explanation,
        securityNotes: data.securityNotes,
        commandExamples: data.commandExamples,
        nextSteps: data.nextSteps,
        timestamp: new Date().toISOString(),
      };

      const next2 = [...next, assistantMessage];
      setMessages(next2);
      persistMessages(next2);
      setPendingWorkflow(data.workflow);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: error.response?.data?.error || 'Failed to generate workflow. Please try again.',
        timestamp: new Date().toISOString(),
      };
      const nextErr = [...next, errorMessage];
      setMessages(nextErr);
      persistMessages(nextErr);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (!pendingWorkflow) return;

    // Save version
    const version: WorkflowVersion = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message: messages[messages.length - 1]?.content || 'Workflow applied',
      workflow: pendingWorkflow,
    };
    const verNext = [version, ...versions].slice(0, 10);
    setVersions(verNext);
    persistVersions(verNext);

    // Apply to canvas
    onApplyWorkflow(pendingWorkflow);
    setPendingWorkflow(null);
  };

  const handleReject = () => {
    setPendingWorkflow(null);
    onPreviewWorkflow(null); // Clear preview
  };

  const handlePreviewShow = () => {
    if (pendingWorkflow) {
      onPreviewWorkflow(pendingWorkflow);
    }
  };

  const handlePreviewHide = () => {
    onPreviewWorkflow(null);
  };

  const handleRestore = (version: WorkflowVersion) => {
    onApplyWorkflow(version.workflow);
  };

  const handleClearHistory = () => {
    if (confirm('Clear all chat history? This cannot be undone.')) {
      console.log('🗑️ Clearing AI Assistant history');
      setMessages([]);
      setVersions([]);
      setPendingWorkflow(null);
      localStorage.removeItem(historyKey);
      localStorage.removeItem(versionsKey);
    }
  };

  if (!isExpanded) {
    return (
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-gradient-to-br from-purple-500 to-pink-500 text-white px-3 py-8 rounded-l-lg cursor-pointer shadow-lg hover:shadow-xl transition-shadow z-50"
        onClick={onToggle}
      >
        <div className="flex flex-col items-center gap-2">
          <Sparkles size={20} />
          <div className="writing-vertical text-xs font-semibold tracking-wide">
            AI ASSIST
          </div>
          {messages.length > 0 && (
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-96 bg-dark-card border-l border-dark-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI Assistant</h3>
            <p className="text-xs text-gray-500">
              {messages.length > 0 ? `${messages.length} messages` : 'Build workflows with AI'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-2 hover:bg-dark-bg rounded-lg transition-colors text-gray-500 hover:text-red-400"
              title="Clear history"
            >
              <History size={16} />
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Sparkles size={48} className="mx-auto mb-4 text-purple-400 opacity-50" />
            <h4 className="text-lg font-semibold mb-2">Start Building with AI</h4>
            <p className="text-sm text-gray-500 mb-4">
              Describe what you want to build and I'll help you create the workflow
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Try:</p>
              <p className="italic">"Create a Telegram trading bot"</p>
              <p className="italic">"Monitor SOL price every 5 minutes"</p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={clsx('flex gap-3', message.role === 'user' ? 'justify-end' : '')}>
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
            )}

            <div className={clsx(
              'max-w-[80%] rounded-lg p-3',
              message.role === 'user'
                ? 'bg-solana-purple text-white'
                : 'bg-dark-bg border border-dark-border'
            )}>
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>

              {/* Explanation */}
              {message.explanation && (
                <div className="mt-3 pt-3 border-t border-dark-border text-xs text-gray-400">
                  <div className="font-semibold mb-1">How it works:</div>
                  <div>{message.explanation}</div>
                </div>
              )}

              {/* Security Notes */}
              {message.securityNotes && message.securityNotes.length > 0 && (
                <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                  <div className="font-semibold mb-1 text-yellow-400">🔒 Security:</div>
                  {message.securityNotes.map((note, i) => (
                    <div key={i} className="text-gray-400">{note}</div>
                  ))}
                </div>
              )}

              {/* Command Examples */}
              {message.commandExamples && message.commandExamples.length > 0 && (
                <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
                  <div className="font-semibold mb-1 text-blue-400">💬 Commands:</div>
                  {message.commandExamples.map((cmd, i) => (
                    <div key={i} className="text-gray-400 italic">"{cmd}"</div>
                  ))}
                </div>
              )}

              {/* Next Steps */}
              {message.nextSteps && message.nextSteps.length > 0 && (
                <div className="mt-3 text-xs">
                  <div className="font-semibold mb-1">Next steps:</div>
                  {message.nextSteps.map((step, i) => (
                    <div key={i} className="text-gray-400">{step}</div>
                  ))}
                </div>
              )}

              {/* Preview & Actions */}
              {message.workflow && index === messages.length - 1 && pendingWorkflow && (
                <div className="mt-3 pt-3 border-t border-dark-border">
                  <div className="text-xs font-semibold mb-2">
                    📦 Generated: {message.workflow.nodes.length} blocks
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    💡 Hover "Accept" to preview changes
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAccept}
                      onMouseEnter={handlePreviewShow}
                      onMouseLeave={handlePreviewHide}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
                    >
                      <Check size={14} />
                      Accept
                    </button>
                    <button
                      onClick={handleReject}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors text-xs font-medium"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-solana-purple flex items-center justify-center flex-shrink-0">
                <div className="text-white text-sm font-semibold">U</div>
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-white animate-pulse" />
            </div>
            <div className="bg-dark-bg border border-dark-border rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span>Generating workflow...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Version History */}
      {versions.length > 0 && (
        <div className="border-t border-dark-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <History size={16} className="text-gray-500" />
            <h4 className="text-sm font-semibold">Version History</h4>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {versions.slice(0, 5).map(version => (
              <div
                key={version.id}
                className="flex items-center justify-between p-2 bg-dark-bg rounded-lg text-xs"
              >
                <div className="flex-1 truncate">
                  <div className="font-medium">{version.message.substring(0, 30)}...</div>
                  <div className="text-gray-500">
                    {new Date(version.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(version)}
                  className="px-2 py-1 bg-solana-purple/20 text-solana-purple rounded hover:bg-solana-purple/30 transition-colors"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-dark-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe what you want to build..."
            disabled={isGenerating}
            className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isGenerating || !input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
