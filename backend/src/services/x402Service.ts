import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { creditsService } from './creditsService';
import { AppError } from '../utils/errors';

export interface X402PrepaymentRequest {
  userId: string;
  amountUsd: number;
}

export interface X402PrepaymentResponse {
  transactionId: string;
  amount: number;
  creditsIssued: number;
  paymentUrl?: string;
  expiresAt: Date;
}

export class X402Service {
  async initiatePrepayment(request: X402PrepaymentRequest): Promise<X402PrepaymentResponse> {
    try {
      const { userId, amountUsd } = request;

      if (amountUsd < 10 || amountUsd > 1000) {
        throw new AppError('Amount must be between $10 and $1000', 400);
      }

      const creditsIssued = amountUsd * 1000;

      const transaction = await prisma.x402Transaction.create({
        data: {
          userId,
          amountUsd,
          creditsIssued,
          status: 'pending',
          facilitator: 'coinbase',
        },
      });

      logger.info('x402 prepayment initiated', {
        transactionId: transaction.id,
        userId,
        amountUsd,
        creditsIssued,
      });

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      return {
        transactionId: transaction.id,
        amount: amountUsd,
        creditsIssued,
        paymentUrl: `solana:${process.env.AGENTFORGE_PAYMENT_WALLET || 'DEMO_WALLET'}?amount=${amountUsd}`,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to initiate x402 prepayment', error);
      throw error;
    }
  }

  async checkPaymentStatus(transactionId: string, userId: string) {
    try {
      const transaction = await prisma.x402Transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new AppError('Transaction not found', 404);
      }

      if (transaction.userId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      if (transaction.status === 'confirmed') {
        return {
          status: 'confirmed' as const,
          creditsGranted: Number(transaction.creditsIssued),
          txHash: transaction.txHash,
        };
      }

      if (transaction.status === 'failed') {
        return {
          status: 'failed' as const,
          error: 'Payment failed or expired',
        };
      }

      return {
        status: 'pending' as const,
      };
    } catch (error) {
      logger.error('Failed to check payment status', error);
      throw error;
    }
  }

  async confirmPayment(transactionId: string, txHash: string) {
    try {
      const transaction = await prisma.x402Transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new AppError('Transaction not found', 404);
      }

      if (transaction.status === 'confirmed') {
        logger.warn('Transaction already confirmed', { transactionId });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.x402Transaction.update({
          where: { id: transactionId },
          data: {
            status: 'confirmed',
            txHash,
          },
        });

        const credits = await tx.credits.findUnique({
          where: { userId: transaction.userId },
        });

        if (credits) {
          await tx.credits.update({
            where: { userId: transaction.userId },
            data: {
              balance: { increment: transaction.creditsIssued },
              lastToppedUp: new Date(),
              totalPaidUsd: { increment: transaction.amountUsd },
            },
          });
        } else {
          await tx.credits.create({
            data: {
              userId: transaction.userId,
              balance: transaction.creditsIssued,
              lastToppedUp: new Date(),
              totalPaidUsd: transaction.amountUsd,
            },
          });
        }
      });

      logger.info('x402 payment confirmed', {
        transactionId,
        txHash,
        creditsIssued: Number(transaction.creditsIssued),
      });
    } catch (error) {
      logger.error('Failed to confirm payment', error);
      throw error;
    }
  }

  async simulatePayment(transactionId: string, userId: string) {
    try {
      const transaction = await prisma.x402Transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new AppError('Transaction not found', 404);
      }

      if (transaction.userId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      const mockTxHash = `SIMULATED_${Math.random().toString(36).substring(2, 15)}`;
      await this.confirmPayment(transactionId, mockTxHash);

      logger.info('Payment simulated for development', { transactionId, mockTxHash });

      return {
        success: true,
        txHash: mockTxHash,
        creditsGranted: Number(transaction.creditsIssued),
      };
    } catch (error) {
      logger.error('Failed to simulate payment', error);
      throw error;
    }
  }
}

export const x402Service = new X402Service();
