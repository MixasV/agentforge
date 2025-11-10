import { EventEmitter } from 'events';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { WorkflowNode, WorkflowEdge, ExecutionContext } from '../types';
import { AppError, InsufficientCreditsError } from '../utils/errors';
import { BLOCKS_REGISTRY } from './blocks';

export class WorkflowExecutor extends EventEmitter {
  constructor() {
    super();
  }

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
        include: {
          variables: true,
        },
      });

      if (!workflow) {
        throw new AppError('Workflow not found', 404);
      }

      if (workflow.userId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      // Build environment variables map
      const envVars: Record<string, string> = {};
      workflow.variables.forEach(v => {
        envVars[v.key] = v.value;
      });

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
        envVars,
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

          // Emit node started event
          const nodeStartTime = Date.now();
          this.emit('nodeStarted', {
            executionId,
            nodeId: node.id,
            nodeType: node.data.type,
            timestamp: new Date().toISOString(),
          });

          if (!block.execute) {
            throw new Error(`Block ${block.name} does not have execute function`);
          }

          let output;
          try {
            output = await block.execute(nodeInputs, context);
            
            context.nodeOutputs[node.id] = output;

            // Emit node completed event
            const duration = Date.now() - nodeStartTime;
            this.emit('nodeCompleted', {
              executionId,
              nodeId: node.id,
              nodeType: node.data.type,
              output,
              duration,
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            // Emit node failed event
            const duration = Date.now() - nodeStartTime;
            this.emit('nodeFailed', {
              executionId,
              nodeId: node.id,
              nodeType: node.data.type,
              error: error.message,
              duration,
              timestamp: new Date().toISOString(),
            });
            throw error;
          }

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

    // Merge data from connected previous nodes (like n8n)
    // Data from previous nodes OVERRIDES node config (except if explicitly set in config)
    const incomingEdges = edges.filter(e => e.target === node.id);
    incomingEdges.forEach(edge => {
      const sourceOutput = context.nodeOutputs[edge.source];
      if (sourceOutput) {
        Object.keys(sourceOutput).forEach(key => {
          const value = sourceOutput[key];
          const currentValue = inputs[key];
          
          // Use value from previous node if current value is empty/undefined
          // or if value from previous node is not empty
          if (
            currentValue === undefined || 
            currentValue === null || 
            currentValue === '' ||
            (value !== undefined && value !== null && value !== '')
          ) {
            inputs[key] = value;
          }
        });
      }
    });

    // Context inputs (from manual run or webhook) - lowest priority
    if (Object.keys(context.inputs).length > 0) {
      Object.keys(context.inputs).forEach(key => {
        if (inputs[key] === undefined || inputs[key] === null || inputs[key] === '') {
          inputs[key] = context.inputs[key];
        }
      });
    }

    // Resolve environment variables: {{env.VARIABLE_NAME}}
    if (context.envVars) {
      Object.keys(inputs).forEach(key => {
        const value = inputs[key];
        if (typeof value === 'string') {
          inputs[key] = value.replace(/\{\{env\.(\w+)\}\}/g, (_, varName) => {
            // Try exact match first, then try uppercase version
            // botToken → try botToken, then BOT_TOKEN
            let envValue = context.envVars?.[varName];
            if (envValue === undefined) {
              const normalizedVarName = varName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
              envValue = context.envVars?.[normalizedVarName];
            }
            
            if (envValue === undefined) {
              logger.warn(`Environment variable not found: ${varName} (tried ${varName} and ${varName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()})`);
              return `{{env.${varName}}}`; // Keep original if not found
            }
            return envValue;
          });
        }
      });
    }

    return inputs;
  }
}

export const workflowExecutor = new WorkflowExecutor();
