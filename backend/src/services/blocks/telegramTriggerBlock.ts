import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const telegramTriggerBlock: BlockDefinition = {
  name: 'Telegram Trigger',
  description: 'Triggers workflow when Telegram bot receives a message or event',
  category: 'trigger',
  tags: ['telegram'], // Show in both trigger and telegram categories
  inputs: [
    // Only configuration inputs, no data outputs here!
    {
      name: 'botToken',
      type: 'string',
      required: false,
      description: 'Telegram Bot Token from @BotFather (optional, uses from Settings if empty)',
    },
  ],
  outputs: [
    // All data outputs - these are NOT inputs!
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
      // RUN mode: Wait for NEW message via long polling
      if (!context?.triggerData) {
        logger.info('Telegram trigger: RUN mode - waiting for NEW message via long polling...');
        
        const botToken = context.envVars?.TELEGRAM_BOT_TOKEN || context.envVars?.botToken;
        if (!botToken) {
          throw new Error('Bot Token is required. Add it to Variables or Settings.');
        }

        // RUN mode: CLEAR old messages and wait for NEW one
        const telegramService = require('../../services/telegramService').telegramService;
        
        // CRITICAL: Delete webhook before long polling (409 Conflict fix)
        try {
          await telegramService.deleteWebhook(botToken);
          logger.info('✅ Webhook deleted - long polling ready');
        } catch (webhookError: any) {
          logger.warn('Failed to delete webhook (might not exist)', { error: webhookError.message });
        }
        
        // Step 1: Get all old pending updates
        const oldUpdates = await telegramService.getUpdates(botToken, { limit: 100, offset: 0 });
        
        // Step 2: CLEAR them all by advancing offset past the last one
        if (oldUpdates && oldUpdates.length > 0) {
          const lastOldId = Math.max(...oldUpdates.map((u: any) => u.update_id));
          await telegramService.getUpdates(botToken, { 
            limit: 1, 
            offset: lastOldId + 1 
          });
          logger.info(`RUN mode: Cleared ${oldUpdates.length} old pending messages. Now waiting for NEW message...`);
        } else {
          logger.info('RUN mode: No old messages. Waiting for NEW message...');
        }
        
        // Step 3: Wait for NEW message (long polling with timeout)
        logger.info('⏳ Waiting for your message (25 seconds)... Send /start now!');
        
        const newUpdates = await telegramService.getUpdates(botToken, { 
          limit: 1, 
          offset: 0,
          timeout: 25, // Wait up to 25 seconds
        });
        
        if (!newUpdates || newUpdates.length === 0) {
          throw new Error(
            'No message received within 25 seconds.\n\n' +
            '⏱️ Timeout: Bot was waiting for your message.\n' +
            'Try again:\n' +
            '1. Click RUN\n' +
            '2. Quickly send a message to your bot (like /start)\n' +
            '3. Bot will process it immediately'
          );
        }
        
        const newMessage = newUpdates[0];
        logger.info('✅ NEW message received!', { 
          updateId: newMessage.update_id,
          messageText: newMessage.message?.text || newMessage.callback_query?.data
        });
        
        context.triggerData = newMessage;
      }

      const update = context.triggerData;

      logger.info('Telegram trigger processing update', {
        hasMessage: !!update.message,
        hasCallbackQuery: !!update.callback_query,
        hasEditedMessage: !!update.edited_message,
      });

      if (update.message) {
        const msg = update.message;
        const chatId = String(msg.chat.id);
        const userId = String(msg.from.id);
        const messageText = msg.text || '';
        
        // Get botToken from Variables (stored in envVars by workflowExecutor)
        const botToken = context.envVars?.botToken || context.envVars?.TELEGRAM_BOT_TOKEN || '';
        
        logger.info('Telegram trigger output', { botToken: botToken ? '***' : 'MISSING', chatId });
        
        return {
          updateType: 'message',
          messageText,
          chatId,
          userId,
          userName: msg.from.username || '',
          firstName: msg.from.first_name || '',
          messageId: msg.message_id,
          callbackQueryId: '',
          callbackData: '',
          fullUpdate: update,
          botToken, // CRITICAL: Add to main output for {{telegram_trigger.botToken}} reference
          // $context: shared data for following blocks
          $context: {
            chatId,
            userId,
            messageText,
            botToken,
          },
        };
      }

      if (update.callback_query) {
        const cbq = update.callback_query;
        const chatId = String(cbq.message?.chat.id || '');
        const userId = String(cbq.from.id);
        const messageText = cbq.message?.text || '';
        
        return {
          updateType: 'callback_query',
          messageText,
          chatId,
          userId,
          userName: cbq.from.username || '',
          firstName: cbq.from.first_name || '',
          messageId: cbq.message?.message_id || 0,
          callbackQueryId: cbq.id,
          callbackData: cbq.data || '',
          fullUpdate: update,
          // $context: shared data for following blocks
          $context: {
            chatId,
            userId,
            messageText,
            callbackQueryId: cbq.id,
            callbackData: cbq.data || '',
            botToken: context.envVars?.TELEGRAM_BOT_TOKEN || context.envVars?.botToken,
          },
        };
      }

      if (update.edited_message) {
        const msg = update.edited_message;
        const chatId = String(msg.chat.id);
        const userId = String(msg.from.id);
        const messageText = msg.text || '';
        
        return {
          updateType: 'edited_message',
          messageText,
          chatId,
          userId,
          userName: msg.from.username || '',
          firstName: msg.from.first_name || '',
          messageId: msg.message_id,
          callbackQueryId: '',
          callbackData: '',
          fullUpdate: update,
          // $context: shared data for following blocks
          $context: {
            chatId,
            userId,
            messageText,
            botToken: context.envVars?.TELEGRAM_BOT_TOKEN || context.envVars?.botToken,
          },
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
