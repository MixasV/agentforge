import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { InsufficientCreditsError, AuthenticationError } from '../utils/errors';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface CreditChargeConfig {
  apiType: string;
  creditCost: number;
}

const API_COSTS: Record<string, number> = {
  jupiter_quote: 1,
  pump_fun_data: 2,
  helius_rpc: 1,
  llm_analysis: 100,
  llm_fast: 50,
  solana_account_info: 1,
  solana_swap_execute: 5,
};

export function chargeCredits(apiType: string, customCost?: number) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError();
      }

      const creditCost = customCost ?? API_COSTS[apiType] ?? 1;

      const userCredits = await prisma.credits.findUnique({
        where: { userId: req.user.id },
      });

      if (!userCredits) {
        const newCredits = await prisma.credits.create({
          data: {
            userId: req.user.id,
            balance: 0,
          },
        });
        throw new InsufficientCreditsError(creditCost, Number(newCredits.balance));
      }

      const currentBalance = Number(userCredits.balance);
      if (currentBalance < creditCost) {
        throw new InsufficientCreditsError(creditCost, currentBalance);
      }

      await prisma.$transaction(async (tx) => {
        await tx.credits.update({
          where: { userId: req.user!.id },
          data: { balance: { decrement: creditCost } },
        });

        await tx.apiUsage.create({
          data: {
            userId: req.user!.id,
            apiType,
            creditsCharged: creditCost,
            status: 'charged',
          },
        });
      });

      const newBalance = currentBalance - creditCost;
      res.setHeader('X-Credits-Remaining', newBalance.toString());
      res.locals.creditsUsed = creditCost;
      res.locals.creditsRemaining = newBalance;

      logger.info('Credits charged', {
        userId: req.user.id,
        apiType,
        creditCost,
        remainingBalance: newBalance,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}
