import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const parseTelegramCommandBlock: BlockDefinition = {
  name: 'Parse Telegram Command',
  description: 'Parse Telegram commands and extract arguments',
  category: 'logic',
  inputs: [
    {
      name: 'messageText',
      type: 'string',
      required: true,
      description: 'Message text from Telegram',
    },
  ],
  outputs: [
    {
      name: 'isCommand',
      type: 'boolean',
      description: 'Whether message is a command',
    },
    {
      name: 'command',
      type: 'string',
      description: 'Command name (without /)',
    },
    {
      name: 'args',
      type: 'array',
      description: 'Array of command arguments',
    },
    {
      name: 'fullArgs',
      type: 'string',
      description: 'All arguments as single string',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { messageText } = inputs;
      const text = String(messageText).trim();

      if (!text.startsWith('/')) {
        return {
          isCommand: false,
          command: '',
          args: [],
          fullArgs: '',
        };
      }

      const parts = text.split(/\s+/);
      let commandPart = parts[0].substring(1);
      
      const atIndex = commandPart.indexOf('@');
      if (atIndex !== -1) {
        commandPart = commandPart.substring(0, atIndex);
      }

      const args = parts.slice(1);
      const fullArgs = args.join(' ');

      logger.info('Telegram command parsed', {
        command: commandPart,
        argsCount: args.length,
      });

      return {
        isCommand: true,
        command: commandPart,
        args,
        fullArgs,
      };
    } catch (error) {
      logger.error('Parse Telegram Command block failed', error);
      throw error;
    }
  },
};
