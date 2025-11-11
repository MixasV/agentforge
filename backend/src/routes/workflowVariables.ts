import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Get all variables for a workflow
router.get('/:workflowId/variables', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workflowId } = req.params;
    const userId = req.user!.id;

    // Verify workflow belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    const variables = await prisma.workflowVariable.findMany({
      where: { workflowId },
      orderBy: { key: 'asc' },
    });

    // Mask secret values in response
    const maskedVariables = variables.map(v => ({
      ...v,
      value: v.isSecret ? '********' : v.value,
    }));

    res.json({
      success: true,
      data: { variables: maskedVariables },
    });
  } catch (error: any) {
    logger.error('Failed to fetch workflow variables', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch variables',
    });
  }
});

// Create or update a variable
router.post('/:workflowId/variables', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workflowId } = req.params;
    const { key, value, description, isSecret, isLocked } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!key || !value) {
      res.status(400).json({
        success: false,
        error: 'Key and value are required',
      });
      return;
    }

    // Keep key as is (don't normalize to uppercase)
    // We want botToken to stay as botToken, not become BOT_TOKEN
    // This prevents confusion with environment variables
    const normalizedKey = key;

    // Verify workflow belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    // Check if variable exists and is locked
    const existing = await prisma.workflowVariable.findUnique({
      where: {
        workflowId_key: {
          workflowId,
          key: normalizedKey,
        },
      },
    });

    // Prevent changing value of locked variables
    if (existing && existing.isLocked && existing.value !== value) {
      res.status(403).json({
        success: false,
        error: `Variable "${key}" is locked and cannot be changed. Unlock it first.`,
      });
      return;
    }

    // Upsert variable
    const variable = await prisma.workflowVariable.upsert({
      where: {
        workflowId_key: {
          workflowId,
          key: normalizedKey,
        },
      },
      update: {
        value,
        description,
        isSecret: isSecret || false,
        isLocked: isLocked !== undefined ? isLocked : (existing?.isLocked || false),
      },
      create: {
        workflowId,
        key: normalizedKey,
        value,
        description,
        isSecret: isSecret || false,
        isLocked: isLocked || false,
      },
    });

    res.json({
      success: true,
      data: {
        variable: {
          ...variable,
          value: variable.isSecret ? '********' : variable.value,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to save workflow variable', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to save variable',
    });
  }
});

// Toggle lock status of a variable
router.patch('/:workflowId/variables/:variableId/lock', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workflowId, variableId } = req.params;
    const { isLocked } = req.body;
    const userId = req.user!.id;

    // Verify workflow belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    const variable = await prisma.workflowVariable.update({
      where: { id: variableId, workflowId },
      data: { isLocked: isLocked },
    });

    res.json({
      success: true,
      data: {
        variable: {
          ...variable,
          value: variable.isSecret ? '********' : variable.value,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to toggle variable lock', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to toggle variable lock',
    });
  }
});

// Delete a variable
router.delete('/:workflowId/variables/:variableId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workflowId, variableId } = req.params;
    const userId = req.user!.id;

    // Verify workflow belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
      return;
    }

    // Check if variable is locked
    const variable = await prisma.workflowVariable.findUnique({
      where: { id: variableId, workflowId },
    });

    if (variable && variable.isLocked) {
      res.status(403).json({
        success: false,
        error: 'Cannot delete locked variable. Unlock it first.',
      });
      return;
    }

    await prisma.workflowVariable.delete({
      where: { id: variableId, workflowId },
    });

    res.json({
      success: true,
      data: { message: 'Variable deleted successfully' },
    });
  } catch (error: any) {
    logger.error('Failed to delete workflow variable', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete variable',
    });
  }
});

export default router;
