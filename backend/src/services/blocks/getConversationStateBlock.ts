import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prisma';

export const getConversationStateBlock: BlockDefinition = {
  name: 'Get Conversation State',
  description: 'Get current conversation state for a user',
  category: 'data',
  inputs: [
    {
      name: 'userId',
      type: 'string',
      required: true,
      description: 'Telegram user ID',
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
      name: 'currentState',
      type: 'string',
      description: 'Current conversation state',
    },
    {
      name: 'stateData',
      type: 'object',
      description: 'State data object',
    },
    {
      name: 'lastMessageId',
      type: 'number',
      description: 'Last message ID',
    },
    {
      name: 'exists',
      type: 'boolean',
      description: 'Whether conversation exists',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { userId, chatId } = inputs;

      logger.info('Getting conversation state', {
        userId,
        chatId,
      });

      const conversation = await prisma.telegramConversation.findUnique({
        where: {
          userId_chatId: {
            userId: userId as string,
            chatId: chatId as string,
          },
        },
      });

      if (!conversation) {
        logger.info('Conversation not found, returning defaults', {
          userId,
          chatId,
        });

        return {
          exists: false,
          currentState: 'IDLE',
          stateData: {},
          lastMessageId: null,
        };
      }

      logger.info('Conversation state retrieved', {
        userId,
        chatId,
        currentState: conversation.currentState,
      });

      return {
        exists: true,
        currentState: conversation.currentState,
        stateData: conversation.stateData || {},
        lastMessageId: conversation.lastMessageId,
      };
    } catch (error) {
      logger.error('Get Conversation State block failed', error);
      throw error;
    }
  },
};
