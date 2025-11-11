import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  walletAddress?: string;
  telegramUserId?: bigint;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    type: string;
    label: string;
    config?: Record<string, unknown>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowCanvas {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface BlockExecutionContext {
  triggerData?: any;
  workflowId?: string;
  executionId?: string;
  userId?: string;
  isManualRun?: boolean;
  envVars?: Record<string, string>;
  nodeOutputs?: Record<string, Record<string, unknown>>;
  creditsUsed?: number;
}

export interface BlockDefinition {
  name: string;
  description: string;
  category: 'data' | 'action' | 'logic' | 'ai' | 'trigger';
  inputs: BlockInput[];
  outputs: BlockOutput[];
  creditsCost: number;
  execute?: (
    inputs: Record<string, unknown>, 
    context?: BlockExecutionContext
  ) => Promise<Record<string, unknown>>;
}

export interface BlockInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'select';
  required: boolean;
  description?: string;
  options?: Array<{ value: string; label: string; credits?: number }>;
  default?: string;
}

export interface BlockOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface ExecutionContext {
  inputs: Record<string, unknown>;
  nodeOutputs: Record<string, Record<string, unknown>>;
  creditsUsed: number;
  userId: string;
  workflowId: string;
  envVars?: Record<string, string>;
  edges?: WorkflowEdge[]; // For discovering connected tools in AI Agent
  allNodes?: WorkflowNode[]; // For resolving tool blocks
  triggerData?: any; // For trigger blocks
  isWebhook?: boolean; // For webhook triggers
  executor?: any; // For emitting tool node events (like n8n visual feedback)
  executionId?: string; // For event emission
}

export interface X402Payment {
  amount: number;
  currency: string;
  recipientWallet: string;
  description: string;
}

export interface X402PaymentResponse {
  paymentId: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  expiresAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
