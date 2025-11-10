import { BlockDefinition } from '../../types';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

export const authorizeSessionKeyBlock: BlockDefinition = {
  name: 'Authorize Session Key',
  description: 'Checks user authorization or creates auth request',
  category: 'trigger',
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
      name: 'validDays',
      type: 'number',
      required: false,
      description: 'Session validity in days (default: 7)',
    },
    {
      name: 'maxTransactions',
      type: 'number',
      required: false,
      description: 'Max transactions (default: 100)',
    },
    {
      name: 'maxAmountSol',
      type: 'number',
      required: false,
      description: 'Max SOL per transaction (default: 1.0)',
    },
  ],
  outputs: [
    {
      name: 'isAuthorized',
      type: 'boolean',
      description: 'Authorization status',
    },
    {
      name: 'authUrl',
      type: 'string',
      description: 'Authorization URL if needed',
    },
    {
      name: 'sessionPublicKey',
      type: 'string',
      description: 'Session key public address',
    },
    {
      name: 'transactionsRemaining',
      type: 'number',
      description: 'Remaining transactions',
    },
    {
      name: 'message',
      type: 'string',
      description: 'Status message',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const {
        userId,
        chatId,
        validDays = 7,
        maxTransactions = 100,
        maxAmountSol = 1.0,
      } = inputs;

      logger.debug('Checking session key authorization', { userId });

      // STEP 1: Check if user has active session
      const existingSession = await prisma.userSession.findFirst({
        where: {
          userId: userId as string,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // STEP 2: If session exists and is valid
      if (existingSession) {
        const transactionsUsed = existingSession.transactionsUsed || 0;
        const transactionsRemaining =
          existingSession.maxTransactions - transactionsUsed;

        const now = new Date();
        const timeRemaining =
          existingSession.expiresAt.getTime() - now.getTime();
        const daysRemaining = Math.ceil(
          timeRemaining / (1000 * 60 * 60 * 24)
        );

        logger.info('User has active session', {
          userId,
          daysRemaining,
          transactionsRemaining,
        });

        return {
          isAuthorized: true,
          sessionPublicKey: existingSession.sessionKeyPublic,
          expiresAt: existingSession.expiresAt.toISOString(),
          transactionsRemaining,
          maxAmountSol: Number(existingSession.maxAmountPerTx) / 1e9,
          daysRemaining,
          message: `✅ Authorized! ${transactionsRemaining} trades left, expires in ${daysRemaining} days`,
        };
      }

      // STEP 3: No active session - create authorization request
      const sessionId = crypto.randomBytes(16).toString('hex');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(validDays));

      await prisma.sessionKeyRequest.create({
        data: {
          id: sessionId,
          userId: userId as string,
          chatId: chatId as string,
          validUntil: expiresAt,
          maxTransactions: Number(maxTransactions),
          maxAmountPerTx: BigInt(Math.floor(Number(maxAmountSol) * 1e9)),
          allowedPrograms: ['JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB'],
          status: 'pending_auth',
        },
      });

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const authUrl = `${baseUrl}/session-auth?sessionId=${sessionId}`;

      logger.info('Session authorization requested', {
        userId,
        sessionId,
        validDays,
      });

      return {
        isAuthorized: false,
        authUrl,
        sessionId,
        validDays,
        maxTransactions,
        maxAmountSol,
        message: `⚠️ Authorization required. Valid for ${validDays} days, max ${maxTransactions} trades`,
      };
    } catch (error) {
      logger.error('Authorize session key block failed', error);
      throw error;
    }
  },
};
