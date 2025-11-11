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

  async executeWithId(
    workflowId: string,
    userId: string,
    inputs: Record<string, unknown> = {},
    executionId: string
  ) {
    return this.execute(workflowId, userId, inputs, executionId);
  }

  async execute(
    workflowId: string,
    userId: string,
    inputs: Record<string, unknown> = {},
    existingExecutionId?: string
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

      // Use existing execution or create new one
      if (existingExecutionId) {
        executionId = existingExecutionId;
        logger.info('Using pre-created execution', { workflowId, executionId });
      } else {
        const execution = await prisma.workflowExecution.create({
          data: {
            workflowId,
            status: 'running',
            inputData: JSON.parse(JSON.stringify(inputs)),
          },
        });
        executionId = execution.id;
      }

      logger.info('Workflow execution started', { workflowId, executionId, userId });

      const sortedNodes = this.topologicalSort(canvas.nodes, canvas.edges);

      const context: ExecutionContext = {
        inputs,
        nodeOutputs: {},
        creditsUsed: 0,
        userId,
        workflowId,
        envVars,
        edges: canvas.edges, // For discovering tool connections
        allNodes: canvas.nodes, // For resolving tool blocks
        triggerData: inputs.triggerData as any, // Pass webhook data to trigger blocks
        isWebhook: !!inputs.triggerData, // Flag for webhook vs RUN mode
        executor: this, // Pass executor for tool node events
        executionId, // Pass executionId for events
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
    // CRITICAL: Exclude tool edges (targetHandle='tool') from topological sort
    // Tool nodes should NOT be in main execution flow - they're called by AI Agent internally
    const mainFlowEdges = edges.filter(edge => edge.targetHandle !== 'tool');
    
    // Get only nodes that are in main flow (not tool nodes)
    const nodesInMainFlow = new Set<string>();
    mainFlowEdges.forEach(edge => {
      nodesInMainFlow.add(edge.source);
      nodesInMainFlow.add(edge.target);
    });
    // Add standalone nodes (triggers without any edges)
    nodes.forEach(node => {
      const hasAnyEdge = edges.some(e => e.source === node.id || e.target === node.id);
      if (!hasAnyEdge) {
        nodesInMainFlow.add(node.id);
      }
    });

    logger.info('Topological sort', { 
      totalEdges: edges.length, 
      mainFlowEdges: mainFlowEdges.length,
      toolEdges: edges.length - mainFlowEdges.length,
      nodesInMainFlow: nodesInMainFlow.size
    });

    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize only nodes in main flow
    nodesInMainFlow.forEach(nodeId => {
      adjacencyList.set(nodeId, []);
      inDegree.set(nodeId, 0);
    });

    mainFlowEdges.forEach(edge => {
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

    logger.info('Topological sort result', {
      sortedNodes: sorted.length,
      expectedMainFlowNodes: nodesInMainFlow.size,
      totalNodes: nodes.length
    });

    if (sorted.length !== nodesInMainFlow.size) {
      throw new AppError('Workflow contains cycles in main flow', 400);
    }

    return sorted;
  }

  /**
   * Get tool blocks connected to AI Agent node via 'tool' handle
   */
  getConnectedTools(nodeId: string, edges: WorkflowEdge[], allNodes: WorkflowNode[]): WorkflowNode[] {
    const toolEdges = edges.filter(
      edge => edge.target === nodeId && edge.targetHandle === 'tool'
    );
    
    const toolNodes = toolEdges
      .map(edge => allNodes.find(n => n.id === edge.source))
      .filter(Boolean) as WorkflowNode[];
    
    logger.info(`Found ${toolNodes.length} tool connections for node ${nodeId}`, {
      tools: toolNodes.map(n => n.data.type)
    });
    
    return toolNodes;
  }

  private resolveInputs(
    node: WorkflowNode,
    context: ExecutionContext,
    edges: WorkflowEdge[]
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = { ...node.data.config };

    // Initialize $context for passing shared data between blocks
    let mergedContext: Record<string, any> = {};

    // Merge data from connected previous nodes (like n8n)
    // Data from previous nodes OVERRIDES node config (except if explicitly set in config)
    const incomingEdges = edges.filter(e => e.target === node.id);
    incomingEdges.forEach(edge => {
      const sourceOutput = context.nodeOutputs[edge.source];
      if (sourceOutput) {
        // Merge $context from previous block
        if (sourceOutput.$context && typeof sourceOutput.$context === 'object') {
          mergedContext = {
            ...mergedContext,
            ...sourceOutput.$context,
          };
        }

        Object.keys(sourceOutput).forEach(key => {
          // Skip $context key (handled separately)
          if (key === '$context') {
            return;
          }

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

    // Add merged $context to inputs
    if (Object.keys(mergedContext).length > 0) {
      inputs.$context = mergedContext;
    }

    // Context inputs (from manual run or webhook) - lowest priority
    if (Object.keys(context.inputs).length > 0) {
      Object.keys(context.inputs).forEach(key => {
        if (inputs[key] === undefined || inputs[key] === null || inputs[key] === '') {
          inputs[key] = context.inputs[key];
        }
      });
    }

    // Resolve dynamic references: {{node_id.output.field.subfield}} or {{node_id.field}}
    Object.keys(inputs).forEach(key => {
      const value = inputs[key];
      if (typeof value === 'string') {
        // Replace {{node_id.output.field.subfield...}} patterns
        inputs[key] = value.replace(/\{\{([\w\.]+)\}\}/g, (match, path) => {
          const parts = path.split('.');
          if (parts.length < 2) {
            logger.warn(`Invalid reference: ${match}`);
            return match;
          }

          const nodeId = parts[0];
          const nodeOutput = context.nodeOutputs[nodeId];
          
          if (!nodeOutput) {
            logger.warn(`Node output not found: ${nodeId}`);
            return match;
          }

          // Skip 'output' keyword if present (for backward compatibility)
          // {{node_id.output.chatId}} = {{node_id.chatId}}
          let startIndex = 1;
          if (parts[1] === 'output' && parts.length > 2) {
            startIndex = 2;
          }

          // Navigate through nested path (e.g., token.name or output.token.name)
          let result: any = nodeOutput;
          for (let i = startIndex; i < parts.length; i++) {
            if (result && typeof result === 'object' && parts[i] in result) {
              result = result[parts[i]];
            } else {
              logger.warn(`Path not found: ${match} (field: ${parts[i]}, available: ${Object.keys(result || {}).join(', ')})`);
              return match;
            }
          }

          // Convert result to string, handle objects
          if (result === null || result === undefined) {
            return '';
          } else if (typeof result === 'object') {
            return JSON.stringify(result, null, 2);
          } else {
            return String(result);
          }
        });
      }
    });

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
