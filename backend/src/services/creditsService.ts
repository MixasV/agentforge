import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';

export class CreditsService {
  async getBalance(userId: string) {
    const credits = await prisma.credits.findUnique({
      where: { userId },
    });

    if (!credits) {
      const newCredits = await prisma.credits.create({
        data: {
          userId,
          balance: 0,
        },
      });
      return {
        balance: Number(newCredits.balance),
        lastToppedUp: newCredits.lastToppedUp,
        totalPaid: Number(newCredits.totalPaidUsd),
      };
    }

    return {
      balance: Number(credits.balance),
      lastToppedUp: credits.lastToppedUp,
      totalPaid: Number(credits.totalPaidUsd),
    };
  }

  async addCredits(userId: string, amount: number, transactionId?: string) {
    const result = await prisma.credits.upsert({
      where: { userId },
      create: {
        userId,
        balance: amount,
        lastToppedUp: new Date(),
      },
      update: {
        balance: { increment: amount },
        lastToppedUp: new Date(),
      },
    });

    logger.info('Credits added', {
      userId,
      amount,
      newBalance: Number(result.balance),
      transactionId,
    });

    return Number(result.balance);
  }

  async deductCredits(userId: string, amount: number) {
    const credits = await prisma.credits.findUnique({
      where: { userId },
    });

    if (!credits) {
      throw new NotFoundError('Credits not found for user');
    }

    const currentBalance = Number(credits.balance);
    if (currentBalance < amount) {
      throw new Error(`Insufficient credits: ${currentBalance} < ${amount}`);
    }

    const result = await prisma.credits.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
      },
    });

    logger.info('Credits deducted', {
      userId,
      amount,
      newBalance: Number(result.balance),
    });

    return Number(result.balance);
  }

  async getUsageStats(userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayUsage, weekUsage, monthUsage] = await Promise.all([
      prisma.apiUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: todayStart },
        },
        _sum: { creditsCharged: true },
      }),
      prisma.apiUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: weekStart },
        },
        _sum: { creditsCharged: true },
      }),
      prisma.apiUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: monthStart },
        },
        _sum: { creditsCharged: true },
      }),
    ]);

    const todayCredits = Number(todayUsage._sum.creditsCharged || 0);
    const weekCredits = Number(weekUsage._sum.creditsCharged || 0);
    const monthCredits = Number(monthUsage._sum.creditsCharged || 0);

    return {
      todayUsage: todayCredits,
      weekUsage: weekCredits,
      monthUsage: monthCredits,
      estimateDailyCost: weekCredits / 7,
    };
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.x402Transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.x402Transaction.count({ where: { userId } }),
    ]);

    return {
      transactions: transactions.map(tx => ({
        id: tx.id,
        txHash: tx.txHash,
        amountUsd: Number(tx.amountUsd),
        creditsIssued: Number(tx.creditsIssued),
        status: tx.status,
        facilitator: tx.facilitator,
        createdAt: tx.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const creditsService = new CreditsService();
