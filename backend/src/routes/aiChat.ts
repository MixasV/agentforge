import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Get chat history for a workflow
router.get('/:workflowId/chat', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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

    const messages = await prisma.aIChatMessage.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: { messages },
    });
  } catch (error: any) {
    logger.error('Failed to fetch chat history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history',
    });
  }
});

// Save chat message
router.post('/:workflowId/chat', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workflowId } = req.params;
    const { role, content, metadata } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!role || !content) {
      res.status(400).json({
        success: false,
        error: 'Role and content are required',
      });
      return;
    }

    if (!['user', 'assistant'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Role must be "user" or "assistant"',
      });
      return;
    }

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

    const message = await prisma.aIChatMessage.create({
      data: {
        workflowId,
        userId,
        role,
        content,
        metadata: metadata || null,
      },
    });

    res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (error: any) {
    logger.error('Failed to save chat message', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to save message',
    });
  }
});

// Clear chat history for a workflow
router.delete('/:workflowId/chat', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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

    await prisma.aIChatMessage.deleteMany({
      where: { workflowId },
    });

    res.json({
      success: true,
      data: { message: 'Chat history cleared' },
    });
  } catch (error: any) {
    logger.error('Failed to clear chat history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat history',
    });
  }
});

export default router;
