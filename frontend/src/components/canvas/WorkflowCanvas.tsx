import { useCallback, useEffect } from 'react';
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
import { NodeInspector } from './NodeInspector';
import { ExecutionLog } from './ExecutionLog';
import { Save, Play, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkflowCanvasProps {
  workflowId?: string;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onRun?: () => void;
}

export function WorkflowCanvas({ workflowId, onSave, onRun }: WorkflowCanvasProps) {
  const { nodes: storeNodes, edges: storeEdges, selectedNode, setNodes, setEdges, setSelectedNode } = useWorkflowStore();
  
  const [nodes, setNodesState, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(storeEdges);

  useEffect(() => {
    setNodesState(storeNodes);
    setEdgesState(storeEdges);
  }, [storeNodes, storeEdges, setNodesState, setEdgesState]);

  useEffect(() => {
    setNodes(nodes);
  }, [nodes, setNodes]);

  useEffect(() => {
    setEdges(edges);
  }, [edges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdgesState((eds) => addEdge(connection, eds));
    },
    [setEdgesState]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    [setSelectedNode]
  );

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
      toast.success('Workflow saved');
    }
  }, [nodes, edges, onSave]);

  const handleRun = useCallback(() => {
    if (onRun) {
      onRun();
      toast.success('Workflow execution started');
    }
  }, [onRun]);

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
        setNodesState((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdgesState((eds) =>
          eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
        );
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
    <div className="h-screen flex">
      <NodePalette />

      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold">Workflow Canvas</h2>
          <div className="flex gap-3">
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold rounded-lg hover:opacity-90 transition-opacity"
              title="Run (Ctrl+Enter)"
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

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
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

      <NodeInspector />
    </div>
  );
}
