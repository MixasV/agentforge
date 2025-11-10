import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { telegramService } from '../telegramService';

export const editTelegramMessageBlock: BlockDefinition = {
  name: 'Edit Telegram Message',
  description: 'Edit an existing Telegram message',
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
      description: 'ID of message to edit',
    },
    {
      name: 'newText',
      type: 'string',
      required: true,
      description: 'New message text',
    },
    {
      name: 'parseMode',
      type: 'string',
      required: false,
      description: 'Parse mode: HTML, Markdown, or MarkdownV2',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether message was edited successfully',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { botToken, chatId, messageId, newText, parseMode = 'HTML' } = inputs;

      logger.info('Editing Telegram message', {
        chatId,
        messageId,
        newTextLength: String(newText).length,
      });

      const result = await telegramService.editMessage(
        botToken as string,
        chatId as string,
        messageId as number,
        newText as string,
        parseMode as string
      );

      if (!result.ok) {
        throw new Error(result.description || 'Failed to edit message');
      }

      logger.info('Telegram message edited successfully', {
        chatId,
        messageId,
      });

      return {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Edit Telegram Message block failed', error);
      throw error;
    }
  },
};
