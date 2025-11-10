import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { telegramService } from './telegramService';
import { userSettingsService } from './userSettingsService';

interface TriggerNode {
  id: string;
  type: string;
  data: {
    config?: any;
  };
}

export class WorkflowActivationService {
  async activateWorkflow(workflowId: string, userId: string): Promise<{
    success: boolean;
    triggersRegistered: number;
    error?: string;
  }> {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { user: true },
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.userId !== userId) {
        throw new Error('Unauthorized');
      }

      const canvas = JSON.parse(workflow.canvasJson);
      const triggerNodes = this.findTriggerNodes(canvas.nodes || []);

      if (triggerNodes.length === 0) {
        throw new Error('Workflow must have at least one trigger node');
      }

      let registeredCount = 0;
      const errors: string[] = [];

      for (const trigger of triggerNodes) {
        try {
          await this.registerTrigger(workflowId, userId, trigger);
          registeredCount++;
        } catch (error: any) {
          logger.error('Failed to register trigger', { 
            workflowId, 
            triggerType: trigger.type, 
            error: error.message 
          });
          errors.push(`${trigger.type}: ${error.message}`);
        }
      }

      if (registeredCount === 0) {
        throw new Error(`Failed to register triggers: ${errors.join(', ')}`);
      }

      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          isActive: true,
          activatedAt: new Date(),
        },
      });

      logger.info('Workflow activated', { 
        workflowId, 
        userId, 
        triggersRegistered: registeredCount 
      });

      return {
        success: true,
        triggersRegistered: registeredCount,
      };
    } catch (error: any) {
      logger.error('Failed to activate workflow', { workflowId, userId, error: error.message });
      return {
        success: false,
        triggersRegistered: 0,
        error: error.message,
      };
    }
  }

  async deactivateWorkflow(workflowId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.userId !== userId) {
        throw new Error('Unauthorized');
      }

      await prisma.triggerRegistration.updateMany({
        where: { workflowId },
        data: { isActive: false },
      });

      await prisma.workflow.update({
        where: { id: workflowId },
        data: { isActive: false },
      });

      logger.info('Workflow deactivated', { workflowId, userId });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to deactivate workflow', { workflowId, userId, error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private findTriggerNodes(nodes: any[]): TriggerNode[] {
    return nodes.filter(node => {
      const nodeType = node.data?.type || node.type;
      return (
        nodeType === 'telegram_trigger' ||
        nodeType === 'schedule_trigger' ||
        nodeType === 'manual_trigger' ||
        nodeType === 'webhook_trigger'
      );
    }).map(node => ({
      id: node.id,
      type: node.data?.type || node.type,
      data: node.data || {}
    }));
  }

  private async registerTrigger(
    workflowId: string,
    userId: string,
    trigger: TriggerNode
  ): Promise<void> {
    switch (trigger.type) {
      case 'telegram_trigger':
        await this.registerTelegramTrigger(workflowId, userId, trigger);
        break;
      case 'schedule_trigger':
        await this.registerScheduleTrigger(workflowId, trigger);
        break;
      case 'manual_trigger':
        await this.registerManualTrigger(workflowId);
        break;
      case 'webhook_trigger':
        await this.registerWebhookTrigger(workflowId, trigger);
        break;
      default:
        throw new Error(`Unknown trigger type: ${trigger.type}`);
    }
  }

  private async registerTelegramTrigger(workflowId: string, userId: string, trigger?: TriggerNode): Promise<void> {
    let botToken = trigger?.data?.config?.botToken;

    if (!botToken) {
      botToken = await userSettingsService.getTelegramBotToken(userId);
    }

    if (!botToken) {
      throw new Error('Please provide bot token in Telegram Trigger block or configure it in Settings');
    }

    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/webhook/telegram/${workflowId}`;

    const result = await telegramService.setWebhook(botToken, webhookUrl);

    if (!result.success) {
      throw new Error(result.description || 'Failed to set Telegram webhook');
    }

    await prisma.triggerRegistration.create({
      data: {
        workflowId,
        triggerType: 'telegram',
        webhookUrl,
        isActive: true,
        config: { botToken },
      },
    });

    logger.info('Telegram trigger registered', { workflowId, webhookUrl });
  }

  private async registerScheduleTrigger(workflowId: string, trigger: TriggerNode): Promise<void> {
    const schedule = trigger.data.config?.interval || '*/5 * * * *';

    await prisma.triggerRegistration.create({
      data: {
        workflowId,
        triggerType: 'schedule',
        schedule,
        config: trigger.data.config,
        isActive: true,
      },
    });

    logger.info('Schedule trigger registered', { workflowId, schedule });
  }

  private async registerManualTrigger(workflowId: string): Promise<void> {
    await prisma.triggerRegistration.create({
      data: {
        workflowId,
        triggerType: 'manual',
        isActive: true,
      },
    });

    logger.info('Manual trigger registered', { workflowId });
  }

  private async registerWebhookTrigger(workflowId: string, trigger: TriggerNode): Promise<void> {
    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/webhook/generic/${workflowId}`;

    await prisma.triggerRegistration.create({
      data: {
        workflowId,
        triggerType: 'webhook',
        webhookUrl,
        config: trigger.data.config,
        isActive: true,
      },
    });

    logger.info('Webhook trigger registered', { workflowId, webhookUrl });
  }
}

export const workflowActivationService = new WorkflowActivationService();
