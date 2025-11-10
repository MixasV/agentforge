import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const getTelegramUserInfoBlock: BlockDefinition = {
  name: 'Get Telegram User Info',
  description: 'Extract user information from Telegram message',
  category: 'data',
  inputs: [
    {
      name: 'telegramUpdate',
      type: 'object',
      required: true,
      description: 'Full Telegram update object',
    },
  ],
  outputs: [
    {
      name: 'userId',
      type: 'string',
      description: 'Telegram user ID',
    },
    {
      name: 'username',
      type: 'string',
      description: 'Telegram username',
    },
    {
      name: 'firstName',
      type: 'string',
      description: 'User first name',
    },
    {
      name: 'lastName',
      type: 'string',
      description: 'User last name',
    },
    {
      name: 'languageCode',
      type: 'string',
      description: 'User language code',
    },
    {
      name: 'isBot',
      type: 'boolean',
      description: 'Whether user is a bot',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { telegramUpdate } = inputs;

      let fromUser;
      if (typeof telegramUpdate === 'object' && telegramUpdate !== null) {
        const update = telegramUpdate as any;
        fromUser = update.message?.from || update.callback_query?.from;
      }

      if (!fromUser) {
        throw new Error('No user information found in update');
      }

      logger.info('Telegram user info extracted', {
        userId: fromUser.id,
        username: fromUser.username,
      });

      return {
        userId: String(fromUser.id),
        username: fromUser.username || '',
        firstName: fromUser.first_name || '',
        lastName: fromUser.last_name || '',
        languageCode: fromUser.language_code || '',
        isBot: fromUser.is_bot || false,
      };
    } catch (error) {
      logger.error('Get Telegram User Info block failed', error);
      throw error;
    }
  },
};
