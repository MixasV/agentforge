import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { telegramService } from '../services/telegramService';
import { logger } from '../utils/logger';
import { WorkflowExecutor } from '../services/workflowExecutor';
import { broadcastExecutionEvent } from './executionStream';

const router = express.Router();

router.post('/telegram/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const telegramUpdate = req.body;

    logger.info('Telegram webhook received', { workflowId, update: telegramUpdate });

    const registration = await prisma.triggerRegistration.findFirst({
      where: {
        workflowId,
        triggerType: 'telegram',
        isActive: true,
      },
    });

    if (!registration) {
      logger.warn('Webhook not registered or inactive', { workflowId });
      return res.status(404).json({ 
        ok: false, 
        error: 'Webhook not registered' 
      });
    }

    const parsedData = telegramService.parseTelegramUpdate(telegramUpdate);
    
    if (!parsedData) {
      logger.warn('Invalid Telegram update format', { workflowId, update: telegramUpdate });
      return res.status(200).json({ ok: true });
    }

    // Save last webhook data for testing (like n8n's pinned data)
    await prisma.triggerRegistration.update({
      where: { id: registration.id },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: { increment: 1 },
        lastTriggerData: telegramUpdate, // Save full webhook data
      },
    });

    logger.info('Telegram message parsed and saved', { 
      workflowId, 
      messageText: parsedData.messageText,
      chatId: parsedData.chatId 
    });

    // Execute workflow with trigger data
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      logger.error('Workflow not found for webhook', { workflowId });
      return res.status(404).json({ ok: false, error: 'Workflow not found' });
    }

    // Execute workflow asynchronously (don't wait for completion)
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

    executor.execute(workflowId, workflow.userId, { triggerData: telegramUpdate })
      .then(() => {
        logger.info('Workflow executed from webhook', { workflowId });
      })
      .catch((error) => {
        logger.error('Workflow execution from webhook failed', { 
          workflowId, 
          error: error.message 
        });
      });

    // Respond immediately to Telegram
    return res.status(200).json({ ok: true });

  } catch (error: any) {
    logger.error('Telegram webhook error', { error: error.message });
    return res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
});

router.post('/generic/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const webhookData = req.body;

    logger.info('Generic webhook received', { workflowId, data: webhookData });

    const registration = await prisma.triggerRegistration.findFirst({
      where: {
        workflowId,
        triggerType: 'webhook',
        isActive: true,
      },
    });

    if (!registration) {
      return res.status(404).json({ 
        success: false, 
        error: 'Webhook not registered' 
      });
    }

    await prisma.triggerRegistration.update({
      where: { id: registration.id },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: { increment: 1 },
      },
    });

    return res.status(200).json({ 
      success: true,
      message: 'Webhook received' 
    });

  } catch (error: any) {
    logger.error('Generic webhook error', { error: error.message });
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
