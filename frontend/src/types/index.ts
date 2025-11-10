export interface User {
  id: string;
  walletAddress?: string;
  telegramUserId?: string;
  credits: number;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreditsBalance {
  balance: number;
  lastToppedUp: string | null;
  totalPaid: number;
}

export interface UsageStats {
  todayUsage: number;
  weekUsage: number;
  monthUsage: number;
  estimateDailyCost: number;
}

export interface Transaction {
  id: string;
  txHash: string | null;
  amountUsd: number;
  creditsIssued: number;
  status: string;
  facilitator: string;
  createdAt: string;
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

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  canvasJson: string;
  isActive: boolean;
  deploymentType?: string;
  deploymentConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed';
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  errorMessage?: string;
  executionTimeMs?: number;
  apiCallsCount: number;
  creditsUsed: number;
  createdAt: string;
}

export interface BlockDefinition {
  type: string;
  name: string;
  description: string;
  category: 'data' | 'action' | 'logic' | 'ai' | 'trigger';
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  creditsCost: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
