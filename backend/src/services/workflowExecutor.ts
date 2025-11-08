import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { WorkflowNode, WorkflowEdge, ExecutionContext } from '../types';
import { AppError, InsufficientCreditsError } from '../utils/errors';
import { BLOCKS_REGISTRY } from './blocks';

export class WorkflowExecutor {
  async execute(
    workflowId: string,
    userId: string,
    inputs: Record<string, unknown> = {}
  ) {
    const startTime = Date.now();
    let executionId: string | null = null;

    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow) {
        throw new AppError('Workflow not found', 404);
      }

      if (workflow.userId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      const canvas = JSON.parse(workflow.canvasJson) as {
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
      };

      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId,
          status: 'running',
          inputData: JSON.parse(JSON.stringify(inputs)),
        },
      });
      executionId = execution.id;

      logger.info('Workflow execution started', { workflowId, executionId, userId });

      const sortedNodes = this.topologicalSort(canvas.nodes, canvas.edges);

      const context: ExecutionContext = {
        inputs,
        nodeOutputs: {},
        creditsUsed: 0,
        userId,
        workflowId,
      };

      for (const node of sortedNodes) {
        try {
          const block = BLOCKS_REGISTRY[node.data.type];
          if (!block) {
            throw new AppError(`Block type "${node.data.type}" not found`, 400);
          }

          const userCredits = await prisma.credits.findUnique({
            where: { userId },
          });

          const currentBalance = userCredits ? Number(userCredits.balance) : 0;
          if (currentBalance < block.creditsCost) {
            throw new InsufficientCreditsError(block.creditsCost, currentBalance);
          }

          const nodeInputs = this.resolveInputs(node, context, canvas.edges);

          logger.debug('Executing node', {
            nodeId: node.id,
            nodeType: node.data.type,
            creditsCost: block.creditsCost,
          });

          const output = await block.execute(nodeInputs);
          context.nodeOutputs[node.id] = output;

          await prisma.$transaction(async (tx) => {
            await tx.credits.update({
              where: { userId },
              data: { balance: { decrement: block.creditsCost } },
            });

            await tx.apiUsage.create({
              data: {
                userId,
                workflowId,
                apiType: node.data.type,
                creditsCharged: block.creditsCost,
                status: 'success',
              },
            });
          });

          context.creditsUsed += block.creditsCost;

          logger.debug('Node executed successfully', {
            nodeId: node.id,
            creditsUsed: block.creditsCost,
          });
        } catch (error) {
          logger.error('Node execution failed', error, {
            nodeId: node.id,
            nodeType: node.data.type,
          });
          throw error;
        }
      }

      const executionTimeMs = Date.now() - startTime;
      const finalOutput = sortedNodes.length > 0
        ? context.nodeOutputs[sortedNodes[sortedNodes.length - 1].id]
        : {};

      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'success',
          outputData: JSON.parse(JSON.stringify(finalOutput)),
          executionTimeMs,
          apiCallsCount: sortedNodes.length,
          creditsUsed: context.creditsUsed,
        },
      });

      await prisma.workflow.update({
        where: { id: workflowId },
        data: { lastExecutedAt: new Date() },
      });

      logger.info('Workflow execution completed', {
        workflowId,
        executionId,
        executionTimeMs,
        creditsUsed: context.creditsUsed,
      });

      return {
        executionId,
        status: 'success' as const,
        output: finalOutput,
        executionTimeMs,
        creditsUsed: context.creditsUsed,
      };
    } catch (error) {
      logger.error('Workflow execution failed', error, { workflowId, userId });

      if (executionId) {
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            executionTimeMs: Date.now() - startTime,
          },
        });
      }

      throw error;
    }
  }

  private topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(node => {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    edges.forEach(edge => {
      const neighbors = adjacencyList.get(edge.source) || [];
      neighbors.push(edge.target);
      adjacencyList.set(edge.source, neighbors);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    const sorted: WorkflowNode[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        sorted.push(node);
      }

      const neighbors = adjacencyList.get(nodeId) || [];
      neighbors.forEach(neighborId => {
        const newDegree = (inDegree.get(neighborId) || 0) - 1;
        inDegree.set(neighborId, newDegree);
        if (newDegree === 0) {
          queue.push(neighborId);
        }
      });
    }

    if (sorted.length !== nodes.length) {
      throw new AppError('Workflow contains cycles', 400);
    }

    return sorted;
  }

  private resolveInputs(
    node: WorkflowNode,
    context: ExecutionContext,
    edges: WorkflowEdge[]
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = { ...node.data.config };

    const incomingEdges = edges.filter(e => e.target === node.id);
    incomingEdges.forEach(edge => {
      const sourceOutput = context.nodeOutputs[edge.source];
      if (sourceOutput) {
        Object.assign(inputs, sourceOutput);
      }
    });

    if (Object.keys(context.inputs).length > 0) {
      Object.assign(inputs, context.inputs);
    }

    return inputs;
  }
}

export const workflowExecutor = new WorkflowExecutor();
