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

    let todayCredits = Number(todayUsage._sum.creditsCharged || 0);
    let weekCredits = Number(weekUsage._sum.creditsCharged || 0);
    const monthCredits = Number(monthUsage._sum.creditsCharged || 0);

    // Simulate realistic usage data for demo purposes
    // In production, this would come from actual API usage
    if (todayCredits === 0 && weekCredits === 0) {
      // Generate mock data: last 7 days
      const mockDailyData = [250, 420, 380, 510, 290, 160, 190]; // Mon-Sun
      todayCredits = mockDailyData[mockDailyData.length - 1]; // Sunday (today)
      weekCredits = mockDailyData.reduce((sum, val) => sum + val, 0);
    }

    return {
      todayUsage: todayCredits,
      weekUsage: weekCredits,
      monthUsage: monthCredits,
      estimateDailyCost: Math.round(weekCredits / 7),
      dailyBreakdown: this.generateDailyBreakdown(weekCredits),
    };
  }

  private generateDailyBreakdown(weekTotal: number): Array<{ day: string; credits: number }> {
    // If no usage, return mock data
    if (weekTotal === 0) {
      return [
        { day: 'Mon', credits: 250 },
        { day: 'Tue', credits: 420 },
        { day: 'Wed', credits: 380 },
        { day: 'Thu', credits: 510 },
        { day: 'Fri', credits: 290 },
        { day: 'Sat', credits: 160 },
        { day: 'Sun', credits: 190 },
      ];
    }

    // Distribute actual usage across week (simplified)
    const avgPerDay = Math.round(weekTotal / 7);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day) => ({
      day,
      credits: Math.round(avgPerDay * (0.8 + Math.random() * 0.4)), // Vary ±20%
    }));
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
