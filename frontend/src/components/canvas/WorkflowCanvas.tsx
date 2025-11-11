import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '@/store/workflowStore';
import { NodePalette } from './NodePalette';
import { NodeInspectorModal } from './NodeInspectorModal';
import { ExecutionLog } from './ExecutionLog';
import { CustomNode } from './CustomNode';
import { AIAssistantPanel } from '../ai/AIAssistantPanel';
import { Save, Play, Download, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkflowCanvasProps {
  workflowId?: string;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onRun?: () => void;
  isRunDisabled?: boolean;
}

export function WorkflowCanvas({ workflowId, onSave, onRun, isRunDisabled = false }: WorkflowCanvasProps) {
  const { nodes: storeNodes, edges: storeEdges, selectedNode, setNodes, setEdges, setSelectedNode } = useWorkflowStore();
  
  const [nodes, setNodesState, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(storeEdges);
  const [isAIExpanded, setIsAIExpanded] = useState(false);
  const [previewWorkflow, setPreviewWorkflow] = useState<{ nodes: any[]; edges: any[] } | null>(null);

  // Storage keys scoped by workflow to avoid collisions and ensure persistence per workflow
  const HISTORY_KEY = useMemo(() => `ai-assistant-history:${workflowId || 'global'}`,[workflowId]);
  const VERSIONS_KEY = useMemo(() => `ai-assistant-versions:${workflowId || 'global'}`,[workflowId]);
  
  // AI Assistant state - persist at this level so it doesn't unmount
  const [aiMessages, setAiMessages] = useState<any[]>(() => {
    // Initialize from localStorage
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('🔄 Loaded', parsed.length, 'AI messages from localStorage');
        return parsed;
      }
      // Legacy fallback + migrate
      const legacy = localStorage.getItem('ai-assistant-history');
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        console.log('🧭 Migrating legacy AI history -> scoped key', parsedLegacy.length);
        try { localStorage.setItem(HISTORY_KEY, legacy); } catch {}
        return parsedLegacy;
      }
    } catch (error) {
      console.error('❌ Failed to load AI messages:', error);
    }
    return [];
  });
  
  const [aiVersions, setAiVersions] = useState<any[]>(() => {
    // Initialize from localStorage
    try {
      const saved = localStorage.getItem(VERSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('🔄 Loaded', parsed.length, 'AI versions from localStorage');
        return parsed;
      }
      // Legacy fallback + migrate
      const legacy = localStorage.getItem('ai-assistant-versions');
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        console.log('🧭 Migrating legacy AI versions -> scoped key', parsedLegacy.length);
        try { localStorage.setItem(VERSIONS_KEY, legacy); } catch {}
        return parsedLegacy;
      }
    } catch (error) {
      console.error('❌ Failed to load AI versions:', error);
    }
    return [];
  });

  // Robust localStorage save with quota-safe fallback
  useEffect(() => {
    console.log('💾 Auto-saving', aiMessages.length, 'AI messages');
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(aiMessages));
    } catch (err) {
      // Fallback: store compact last 30 messages (role/content/timestamp only)
      console.error('❌ Failed to persist full AI history, saving compact version', err);
      try {
        const compact = aiMessages.slice(-30).map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(compact));
      } catch (err2) {
        console.error('❌ Failed to persist compact AI history', err2);
      }
    }
  }, [aiMessages, HISTORY_KEY]);

  useEffect(() => {
    console.log('💾 Auto-saving', aiVersions.length, 'AI versions');
    try {
      // Limit stored versions to last 10 to avoid exceeding localStorage quota
      const limited = aiVersions.slice(0, 10);
      localStorage.setItem(VERSIONS_KEY, JSON.stringify(limited));
    } catch (err) {
      console.error('❌ Failed to persist AI versions', err);
      try {
        // As a last resort, drop versions history to keep chat persistence
        localStorage.setItem(VERSIONS_KEY, JSON.stringify([]));
      } catch {
        /* noop */
      }
    }
  }, [aiVersions, VERSIONS_KEY]);

  // Wrap onNodesChange to sync positions to store
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

  // Sync nodes from store only if a new node was added (not just position change)
  useEffect(() => {
    if (storeNodes.length !== nodes.length) {
      // New node added or removed - merge with existing positions
      setNodesState(storeNodes.map(storeNode => {
        const existingNode = nodes.find(n => n.id === storeNode.id);
        return existingNode || storeNode;
      }));
    }
  }, [storeNodes.length]);

  useEffect(() => {
    setEdgesState(storeEdges);
  }, [storeEdges, setEdgesState]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdgesState((eds) => {
        const newEdges = addEdge(connection, eds);
        setEdges(newEdges);
        return newEdges;
      });
    },
    [setEdgesState, setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    [setSelectedNode]
  );

  const handleSave = useCallback(() => {
    // Sync current UI state (with positions!) to store
    setNodes(nodes);
    setEdges(edges);
    
    // Save current nodes/edges (with updated positions from ReactFlow)
    if (onSave) {
      onSave(nodes, edges);
      toast.success('Workflow saved');
    }
  }, [nodes, edges, onSave, setNodes, setEdges]);

  const handleRun = useCallback(() => {
    if (isRunDisabled) {
      toast.error('Insufficient credits! Please add credits to run workflow.');
      return;
    }
    if (onRun) {
      onRun();
      toast.success('Workflow execution started');
    }
  }, [onRun, isRunDisabled]);

  const handleApplyAIWorkflow = useCallback((workflow: { nodes: any[]; edges: any[] }) => {
    console.log('🎨 Applying AI workflow:', workflow.nodes.length, 'nodes');
    
    // Clear preview first
    setPreviewWorkflow(null);
    
    // ✅ FULL NORMALIZATION: Ensure all nodes have complete data structure
    const processedNodes = workflow.nodes.map(node => {
      const originalType = node.data?.type || node.type; // preserve block type
      const originalLabel = node.data?.label || node.data?.name || node.label || node.name;
      const originalCategory = node.data?.category || node.category;
      const originalDescription = node.data?.description || '';
      const originalCreditsCost = node.data?.creditsCost || 0;
      const originalConfig = node.data?.config || node.config || {}; // ✅ Initialize empty config
      
      return {
        ...node,
        type: 'customNode',
        data: {
          type: originalType, // Block type
          label: originalLabel || 'Unknown Block',
          category: originalCategory || 'logic',
          description: originalDescription,
          creditsCost: originalCreditsCost,
          config: originalConfig, // ✅ ALWAYS present
        },
      };
    });
    
    console.log('✅ Processed nodes:', processedNodes);
    
    // Apply to both local state AND store
    setNodesState(processedNodes);
    setEdgesState(workflow.edges);
    setNodes(processedNodes);
    setEdges(workflow.edges);
    
    console.log('✅ Nodes applied to store and canvas');
    toast.success(`Applied ${processedNodes.length} blocks to canvas`);
  }, [setNodesState, setEdgesState, setNodes, setEdges]);

  const handlePreviewWorkflow = useCallback((workflow: { nodes: any[]; edges: any[] } | null) => {
    if (workflow) {
      // Process preview nodes the same way as apply
      const processedNodes = workflow.nodes.map(node => {
        const originalType = node.data?.type || node.type;
        const originalLabel = node.data?.label || node.data?.name || node.label || node.name;
        const originalCategory = node.data?.category || node.category;
        const originalConfig = node.data?.config || node.config || {};
        return {
          ...node,
          type: 'customNode',
          data: {
            ...node.data,
            type: originalType,
            label: originalLabel || 'Unknown Block',
            category: originalCategory || 'logic',
            config: originalConfig,
          },
        };
      });
      setPreviewWorkflow({ nodes: processedNodes, edges: workflow.edges });
    } else {
      setPreviewWorkflow(null);
    }
  }, []);

  const handleExport = useCallback(() => {
    const workflowData = {
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${workflowId || 'draft'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exported');
  }, [nodes, edges, workflowId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNode) {
        setNodesState((nds) => {
          const newNodes = nds.filter((n) => n.id !== selectedNode.id);
          setNodes(newNodes);
          return newNodes;
        });
        setEdgesState((eds) => {
          const newEdges = eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id);
          setEdges(newEdges);
          return newEdges;
        });
        setSelectedNode(null);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, setNodesState, setEdgesState, setSelectedNode, handleSave, handleRun]);

  return (
    <div className="h-full flex">
      <NodePalette workflowId={workflowId} onSave={handleSave} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold">Workflow Canvas</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setIsAIExpanded(!isAIExpanded)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              title="AI Assistant"
            >
              <Sparkles size={18} />
              AI Assist
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-solana-purple/10 text-solana-purple rounded-lg hover:bg-solana-purple/20 transition-colors"
              title="Save (Ctrl+S)"
            >
              <Save size={18} />
              Save
            </button>
            <button
              onClick={handleRun}
              disabled={isRunDisabled}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              title={isRunDisabled ? "Insufficient credits - please top up" : "Run (Ctrl+Enter)"}
            >
              <Play size={18} />
              Run
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-dark-bg border border-dark-border text-white rounded-lg hover:border-solana-purple transition-colors"
              title="Export JSON"
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <ReactFlow
            nodes={previewWorkflow ? previewWorkflow.nodes : nodes}
            edges={previewWorkflow ? previewWorkflow.edges : edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-dark-bg"
          >
            <Background color="#2A2A2A" gap={16} />
            <Controls className="bg-dark-card border border-dark-border" />
            <MiniMap
              className="bg-dark-card border border-dark-border"
              nodeColor={(node) => {
                const category = (node.data as any)?.category;
                switch (category) {
                  case 'data':
                    return '#4A90E2';
                  case 'action':
                    return '#FF6B6B';
                  case 'logic':
                    return '#F5D547';
                  case 'ai':
                    return '#9B59B6';
                  default:
                    return '#14F195';
                }
              }}
            />
            <Panel position="top-right" className="bg-transparent">
              <div className="text-xs text-gray-500 bg-dark-card px-3 py-2 rounded-lg border border-dark-border">
                {nodes.length} nodes, {edges.length} connections
              </div>
            </Panel>
          </ReactFlow>
        </div>

        <ExecutionLog />
      </div>

      <AIAssistantPanel
        isExpanded={isAIExpanded}
        onToggle={() => setIsAIExpanded(!isAIExpanded)}
        currentWorkflow={{ nodes, edges }}
        onApplyWorkflow={handleApplyAIWorkflow}
        onPreviewWorkflow={handlePreviewWorkflow}
        messages={aiMessages}
        setMessages={setAiMessages}
        versions={aiVersions}
        setVersions={setAiVersions}
        historyKey={HISTORY_KEY}
        versionsKey={VERSIONS_KEY}
      />

      <NodeInspectorModal />
    </div>
  );
}
