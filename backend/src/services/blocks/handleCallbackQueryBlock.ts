import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { telegramService } from '../telegramService';

export const handleCallbackQueryBlock: BlockDefinition = {
  name: 'Handle Callback Query',
  description: 'Process button clicks from inline keyboards',
  category: 'action',
  inputs: [
    {
      name: 'botToken',
      type: 'string',
      required: true,
      description: 'Telegram Bot Token from @BotFather',
    },
    {
      name: 'callbackQueryId',
      type: 'string',
      required: true,
      description: 'Callback query ID from Telegram update',
    },
    {
      name: 'answerText',
      type: 'string',
      required: false,
      description: 'Optional text to show to user',
    },
    {
      name: 'showAlert',
      type: 'boolean',
      required: false,
      description: 'Show as alert popup (default: false)',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether callback was answered successfully',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { botToken, callbackQueryId, answerText, showAlert = false } = inputs;

      logger.info('Answering callback query', {
        callbackQueryId,
        hasText: !!answerText,
        showAlert,
      });

      const result = await telegramService.answerCallbackQuery(
        botToken as string,
        callbackQueryId as string,
        answerText as string | undefined,
        showAlert as boolean
      );

      if (!result.ok) {
        throw new Error(result.description || 'Failed to answer callback query');
      }

      logger.info('Callback query answered successfully', {
        callbackQueryId,
      });

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Handle Callback Query block failed', error);
      throw error;
    }
  },
};
