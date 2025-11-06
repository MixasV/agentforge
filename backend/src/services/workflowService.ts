import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { WorkflowCanvas } from '../types';

export class WorkflowService {
  async createWorkflow(userId: string, data: { name: string; description?: string }) {
    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        canvasJson: JSON.stringify({ nodes: [], edges: [] }),
        isActive: false,
      },
    });

    logger.info('Workflow created', { workflowId: workflow.id, userId });

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      canvasJson: workflow.canvasJson,
      isActive: workflow.isActive,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  async getWorkflows(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflow.count({ where: { userId } }),
    ]);

    return {
      workflows: workflows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        isActive: w.isActive,
        deploymentType: w.deploymentType,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        lastExecutedAt: w.lastExecutedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWorkflowById(workflowId: string, userId: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new AuthorizationError('You do not have access to this workflow');
    }

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      canvasJson: workflow.canvasJson,
      isActive: workflow.isActive,
      deploymentType: workflow.deploymentType,
      deploymentConfig: workflow.deploymentConfig,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      lastExecutedAt: workflow.lastExecutedAt,
    };
  }

  async updateWorkflow(
    workflowId: string,
    userId: string,
    data: {
      name?: string;
      description?: string | null;
      canvasJson?: string;
      isActive?: boolean;
    }
  ) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new AuthorizationError('You do not have access to this workflow');
    }

    if (data.canvasJson) {
      try {
        const canvas = JSON.parse(data.canvasJson) as WorkflowCanvas;
        if (!canvas.nodes || !Array.isArray(canvas.nodes) || !canvas.edges || !Array.isArray(canvas.edges)) {
          throw new Error('Invalid canvas structure');
        }
      } catch (error) {
        throw new Error('Invalid canvasJson format');
      }
    }

    const updated = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.canvasJson && { canvasJson: data.canvasJson }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    logger.info('Workflow updated', { workflowId, userId });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      canvasJson: updated.canvasJson,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteWorkflow(workflowId: string, userId: string) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new AuthorizationError('You do not have access to this workflow');
    }

    await prisma.workflow.delete({
      where: { id: workflowId },
    });

    logger.info('Workflow deleted', { workflowId, userId });

    return { success: true };
  }

  async getWorkflowExecutions(workflowId: string, userId: string, page: number = 1, limit: number = 20) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    if (workflow.userId !== userId) {
      throw new AuthorizationError('You do not have access to this workflow');
    }

    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where: { workflowId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflowExecution.count({ where: { workflowId } }),
    ]);

    return {
      executions: executions.map(e => ({
        id: e.id,
        status: e.status,
        inputData: e.inputData,
        outputData: e.outputData,
        errorMessage: e.errorMessage,
        executionTimeMs: e.executionTimeMs,
        apiCallsCount: e.apiCallsCount,
        creditsUsed: Number(e.creditsUsed),
        createdAt: e.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const workflowService = new WorkflowService();
