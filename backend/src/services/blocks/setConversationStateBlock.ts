import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prisma';
import { Prisma } from '@prisma/client';

export const setConversationStateBlock: BlockDefinition = {
  name: 'Set Conversation State',
  description: 'Set conversation state for a user',
  category: 'telegram',
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
    {
      name: 'newState',
      type: 'string',
      required: true,
      description: 'New conversation state (e.g. IDLE, BUY_TOKEN_ADDRESS)',
    },
    {
      name: 'stateData',
      type: 'object',
      required: false,
      description: 'Optional state data to store',
    },
    {
      name: 'workflowId',
      type: 'string',
      required: false,
      description: 'Optional workflow ID',
    },
    {
      name: 'lastMessageId',
      type: 'number',
      required: false,
      description: 'Optional last message ID',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether state was set successfully',
    },
    {
      name: 'previousState',
      type: 'string',
      description: 'Previous conversation state',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { userId, chatId, newState, stateData, workflowId, lastMessageId } = inputs;

      logger.info('Setting conversation state', {
        userId,
        chatId,
        newState,
      });

      const existing = await prisma.telegramConversation.findUnique({
        where: {
          userId_chatId: {
            userId: userId as string,
            chatId: chatId as string,
          },
        },
      });

      const previousState = existing?.currentState || 'IDLE';

      const updateData: any = {
        currentState: newState as string,
        updatedAt: new Date(),
      };

      if (stateData !== undefined) {
        updateData.stateData = stateData;
      }

      if (workflowId !== undefined) {
        updateData.workflowId = workflowId;
      }

      if (lastMessageId !== undefined) {
        updateData.lastMessageId = lastMessageId;
      }

      await prisma.telegramConversation.upsert({
        where: {
          userId_chatId: {
            userId: userId as string,
            chatId: chatId as string,
          },
        },
        update: updateData,
        create: {
          userId: userId as string,
          chatId: chatId as string,
          currentState: newState as string,
          stateData: stateData ? (stateData as Prisma.InputJsonValue) : Prisma.DbNull,
          workflowId: workflowId as string | undefined,
          lastMessageId: lastMessageId as number | undefined,
        },
      });

      logger.info('Conversation state set successfully', {
        userId,
        chatId,
        previousState,
        newState,
      });

      return {
        success: true,
        previousState,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Set Conversation State block failed', error);
      throw error;
    }
  },
};
