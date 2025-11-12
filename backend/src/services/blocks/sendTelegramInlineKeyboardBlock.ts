import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { telegramService } from '../telegramService';

export const sendTelegramInlineKeyboardBlock: BlockDefinition = {
  name: 'Send Telegram Inline Keyboard',
  description: 'Send a message with inline keyboard buttons',
  category: 'telegram',
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
      name: 'message',
      type: 'string',
      required: true,
      description: 'Message text to send',
    },
    {
      name: 'buttons',
      type: 'string',
      required: true,
      description: 'JSON array of button rows: [[{text:"Buy",callback_data:"buy"}]]',
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
      description: 'Whether message was sent successfully',
    },
    {
      name: 'messageId',
      type: 'number',
      description: 'ID of sent message',
    },
    {
      name: 'chatId',
      type: 'string',
      description: 'Chat ID where message was sent',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { botToken, chatId, message, buttons, parseMode = 'HTML' } = inputs;

      let keyboard: any[][];
      
      if (typeof buttons === 'string') {
        try {
          // Fix single quotes to double quotes (common LLM mistake)
          const fixedButtons = (buttons as string).replace(/'/g, '"');
          keyboard = JSON.parse(fixedButtons);
        } catch (e) {
          throw new Error('Invalid buttons JSON format. Expected: [[{text:"Button",callback_data:"data"}]]');
        }
      } else {
        keyboard = buttons as any[][];
      }

      if (!Array.isArray(keyboard)) {
        throw new Error('Buttons must be an array of arrays');
      }

      logger.info('Sending Telegram message with inline keyboard', {
        chatId,
        messageLength: String(message).length,
        buttonsCount: keyboard.reduce((sum, row) => sum + row.length, 0),
      });

      const result = await telegramService.sendMessageWithKeyboard(
        botToken as string,
        chatId as string,
        message as string,
        keyboard,
        parseMode as string
      );

      if (!result.ok) {
        throw new Error(result.description || 'Failed to send message');
      }

      logger.info('Telegram message with keyboard sent successfully', {
        chatId,
        messageId: result.message_id,
      });

      return {
        success: true,
        messageId: result.message_id,
        chatId: chatId as string,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Send Telegram Inline Keyboard block failed', error);
      throw error;
    }
  },
};
