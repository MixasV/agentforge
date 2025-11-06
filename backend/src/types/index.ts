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

export interface BlockDefinition {
  name: string;
  description: string;
  category: 'data' | 'action' | 'logic' | 'ai';
  inputs: BlockInput[];
  outputs: BlockOutput[];
  creditsCost: number;
  execute: (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export interface BlockInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
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
