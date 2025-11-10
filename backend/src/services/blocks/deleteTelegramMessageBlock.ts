import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { telegramService } from '../telegramService';

export const deleteTelegramMessageBlock: BlockDefinition = {
  name: 'Delete Telegram Message',
  description: 'Delete a Telegram message',
  category: 'action',
  inputs: [
    {
      name: 'botToken',
      type: 'string',
      required: true,
      description: 'Telegram Bot Token from @BotFather',
    },
    {
      name: 'chatId',
      type: 'string',
      required: true,
      description: 'Telegram chat ID',
    },
    {
      name: 'messageId',
      type: 'number',
      required: true,
      description: 'ID of message to delete',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether message was deleted successfully',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { botToken, chatId, messageId } = inputs;

      logger.info('Deleting Telegram message', {
        chatId,
        messageId,
      });

      const result = await telegramService.deleteMessage(
        botToken as string,
        chatId as string,
        messageId as number
      );

      if (!result.ok) {
        throw new Error(result.description || 'Failed to delete message');
      }

      logger.info('Telegram message deleted successfully', {
        chatId,
        messageId,
      });

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Delete Telegram Message block failed', error);
      throw error;
    }
  },
};
