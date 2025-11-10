import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const telegramTriggerBlock: BlockDefinition = {
  name: 'Telegram Trigger',
  description: 'Triggers workflow when Telegram bot receives a message or callback query',
  category: 'trigger',
  inputs: [
    {
      name: 'botToken',
      type: 'string',
      required: false,
      description: 'Telegram Bot Token from @BotFather (optional, can use from Settings)',
    },
    {
      name: 'updateTypes',
      type: 'string',
      required: false,
      description: 'Comma-separated update types: message,callback_query,edited_message',
    },
  ],
  outputs: [
    {
      name: 'updateType',
      type: 'string',
      description: 'Type of update: message, callback_query, edited_message',
    },
    {
      name: 'messageText',
      type: 'string',
      description: 'Text content of the received message',
    },
    {
      name: 'chatId',
      type: 'string',
      description: 'Telegram chat ID where message was sent',
    },
    {
      name: 'userId',
      type: 'string',
      description: 'Telegram user ID who sent the message',
    },
    {
      name: 'userName',
      type: 'string',
      description: 'Telegram username (if available)',
    },
    {
      name: 'firstName',
      type: 'string',
      description: 'User first name',
    },
    {
      name: 'messageId',
      type: 'number',
      description: 'Telegram message ID',
    },
    {
      name: 'callbackQueryId',
      type: 'string',
      description: 'Callback query ID (for button clicks)',
    },
    {
      name: 'callbackData',
      type: 'string',
      description: 'Callback data from button click',
    },
    {
      name: 'fullUpdate',
      type: 'object',
      description: 'Full Telegram update object',
    },
  ],
  creditsCost: 0,
  execute: async (_inputs, context) => {
    try {
      // If no trigger data, try to use last saved webhook data (like n8n's pinned data)
      if (!context?.triggerData) {
        logger.info('Telegram trigger: Manual run mode - looking for last webhook data');
        
        // Try to find last saved webhook data for this workflow
        const { prisma } = await import('../../utils/prisma');
        const registration = await prisma.triggerRegistration.findFirst({
          where: {
            workflowId: context.workflowId,
            triggerType: 'telegram',
          },
          orderBy: {
            lastTriggeredAt: 'desc',
          },
        });

        if (registration?.lastTriggerData) {
          logger.info('Using last saved webhook data for manual run');
          const savedData = registration.lastTriggerData as any;
          
          // Use saved data as if it was a real webhook
          if (savedData.message) {
            const msg = savedData.message;
            return {
              updateType: 'message',
              messageText: msg.text || '',
              chatId: String(msg.chat.id),
              userId: String(msg.from.id),
              userName: msg.from.username || '',
              firstName: msg.from.first_name || '',
              messageId: msg.message_id,
              callbackQueryId: '',
              callbackData: '',
              fullUpdate: savedData,
              isTestRun: true, // Mark as test run
            };
          }
        }

        // No saved data available
        logger.warn('No saved webhook data found - cannot run test');
        throw new Error(
          'Cannot test workflow: No Telegram data available. Please activate the workflow and send a message to your bot first, then you can test with that data.'
        );
      }

      const update = context.triggerData;

      logger.info('Telegram trigger processing update', {
        hasMessage: !!update.message,
        hasCallbackQuery: !!update.callback_query,
        hasEditedMessage: !!update.edited_message,
      });

      if (update.message) {
        const msg = update.message;
        return {
          updateType: 'message',
          messageText: msg.text || '',
          chatId: String(msg.chat.id),
          userId: String(msg.from.id),
          userName: msg.from.username || '',
          firstName: msg.from.first_name || '',
          messageId: msg.message_id,
          callbackQueryId: '',
          callbackData: '',
          fullUpdate: update,
        };
      }

      if (update.callback_query) {
        const cbq = update.callback_query;
        return {
          updateType: 'callback_query',
          messageText: cbq.message?.text || '',
          chatId: String(cbq.message?.chat.id || ''),
          userId: String(cbq.from.id),
          userName: cbq.from.username || '',
          firstName: cbq.from.first_name || '',
          messageId: cbq.message?.message_id || 0,
          callbackQueryId: cbq.id,
          callbackData: cbq.data || '',
          fullUpdate: update,
        };
      }

      if (update.edited_message) {
        const msg = update.edited_message;
        return {
          updateType: 'edited_message',
          messageText: msg.text || '',
          chatId: String(msg.chat.id),
          userId: String(msg.from.id),
          userName: msg.from.username || '',
          firstName: msg.from.first_name || '',
          messageId: msg.message_id,
          callbackQueryId: '',
          callbackData: '',
          fullUpdate: update,
        };
      }

      return {
        updateType: 'unknown',
        messageText: '',
        chatId: '',
        userId: '',
      };
    } catch (error) {
      logger.error('Telegram trigger block failed', error);
      throw error;
    }
  },
};
