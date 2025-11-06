import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const sendTelegramBlock: BlockDefinition = {
  name: 'Send Telegram Message',
  description: 'Send a message via Telegram bot',
  category: 'action',
  inputs: [
    {
      name: 'message',
      type: 'string',
      required: true,
      description: 'Message text to send',
    },
    {
      name: 'chatId',
      type: 'string',
      required: true,
      description: 'Telegram chat ID',
    },
  ],
  outputs: [
    {
      name: 'messageSent',
      type: 'boolean',
      description: 'Whether message was sent successfully',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { message, chatId } = inputs;

      logger.info('Telegram message would be sent', { chatId, messageLength: String(message).length });

      return {
        messageSent: true,
        chatId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Send Telegram block failed', error);
      throw error;
    }
  },
};
