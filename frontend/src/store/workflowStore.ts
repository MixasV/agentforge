import { create } from 'zustand';
import { Node, Edge } from 'reactflow';

export type NodeExecutionState = 'idle' | 'executing' | 'success' | 'error';

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  executionStates: Record<string, NodeExecutionState>;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, data: Partial<Node>) => void;
  removeNode: (nodeId: string) => void;
  setSelectedNode: (node: Node | null) => void;
  clearWorkflow: () => void;
  setNodeExecutionState: (nodeId: string, state: NodeExecutionState) => void;
  clearExecutionStates: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  executionStates: {},

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  updateNode: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...data } : node
      ),
    })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode,
    })),

  setSelectedNode: (node) => set({ selectedNode: node }),

  clearWorkflow: () => set({ nodes: [], edges: [], selectedNode: null, executionStates: {} }),

  setNodeExecutionState: (nodeId, state) =>
    set((prevState) => ({
      executionStates: {
        ...prevState.executionStates,
        [nodeId]: state,
      },
    })),

  clearExecutionStates: () => set({ executionStates: {} }),
}));
