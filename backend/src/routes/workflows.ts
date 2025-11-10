import { Router } from 'express';
import { workflowService } from '../services/workflowService';
import { WorkflowExecutor } from '../services/workflowExecutor';
import { workflowActivationService } from '../services/workflowActivationService';
import { broadcastExecutionEvent } from './executionStream';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import {
  validateSchema,
  paginationSchema,
  workflowCreateSchema,
  workflowUpdateSchema,
  workflowRunSchema,
  uuidSchema,
} from '../utils/validation';
import { AuthRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { page, limit } = validateSchema(paginationSchema, req.query);
    const result = await workflowService.getWorkflows(req.user.id, page, limit);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const data = validateSchema(workflowCreateSchema, req.body);
    const workflow = await workflowService.createWorkflow(req.user.id, data);

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const workflowId = validateSchema(uuidSchema, req.params.id);
    const workflow = await workflowService.getWorkflowById(workflowId, req.user.id);

    return res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const workflowId = validateSchema(uuidSchema, req.params.id);
    const data = validateSchema(workflowUpdateSchema, req.body);
    const workflow = await workflowService.updateWorkflow(workflowId, req.user.id, data);

    return res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const workflowId = validateSchema(uuidSchema, req.params.id);
    const result = await workflowService.deleteWorkflow(workflowId, req.user.id);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/run', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const workflowId = validateSchema(uuidSchema, req.params.id);
    const { inputs } = validateSchema(workflowRunSchema, req.body);

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId, userId: req.user.id },
    });
    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    const executor = new WorkflowExecutor();
    
    executor.on('nodeStarted', (event) => {
      broadcastExecutionEvent(workflowId, event.executionId, { type: 'nodeStarted', ...event });
    });
    
    executor.on('nodeCompleted', (event) => {
      broadcastExecutionEvent(workflowId, event.executionId, { type: 'nodeCompleted', ...event });
    });
    
    executor.on('nodeFailed', (event) => {
      broadcastExecutionEvent(workflowId, event.executionId, { type: 'nodeFailed', ...event });
    });

    const result = await executor.execute(workflowId, req.user.id, inputs || {});

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/executions', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const workflowId = validateSchema(uuidSchema, req.params.id);
    const { page, limit } = validateSchema(paginationSchema, req.query);

    const result = await workflowService.getWorkflowExecutions(workflowId, req.user.id, page, limit);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/activate', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const workflowId = validateSchema(uuidSchema, req.params.id);
    const result = await workflowActivationService.activateWorkflow(workflowId, req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      data: {
        triggersRegistered: result.triggersRegistered,
        message: 'Workflow activated successfully',
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/deactivate', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const workflowId = validateSchema(uuidSchema, req.params.id);
    const result = await workflowActivationService.deactivateWorkflow(workflowId, req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: 'Workflow deactivated successfully',
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
