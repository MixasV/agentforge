import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { phantomCashService } from './phantomCashService';

export interface X402PrepaymentRequest {
  userId: string;
  amountUsd: number;
  currency?: 'USDC' | 'CASH';
}

export interface X402PrepaymentResponse {
  transactionId: string;
  amount: number;
  creditsIssued: number;
  currency: string;
  tokenMint?: string;
  paymentUrl?: string;
  expiresAt: Date;
}

export class X402Service {
  async initiatePrepayment(request: X402PrepaymentRequest): Promise<X402PrepaymentResponse> {
    try {
      const { userId, amountUsd, currency = 'USDC' } = request;

      if (amountUsd < 10 || amountUsd > 1000) {
        throw new AppError('Amount must be between $10 and $1000', 400);
      }

      const creditsIssued = amountUsd * 1000;

      if (currency === 'CASH') {
        return await this.initiateCashPrepayment(userId, amountUsd, creditsIssued);
      }

      const transaction = await prisma.x402Transaction.create({
        data: {
          userId,
          amountUsd,
          creditsIssued,
          status: 'pending',
          facilitator: 'coinbase',
          currency: 'USDC',
        },
      });

      logger.info('x402 prepayment initiated', {
        transactionId: transaction.id,
        userId,
        amountUsd,
        creditsIssued,
        currency,
      });

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      return {
        transactionId: transaction.id,
        amount: amountUsd,
        creditsIssued,
        currency: 'USDC',
        paymentUrl: `solana:${process.env.AGENTFORGE_PAYMENT_WALLET || 'DEMO_WALLET'}?amount=${amountUsd}`,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to initiate x402 prepayment', error);
      throw error;
    }
  }

  private async initiateCashPrepayment(
    userId: string,
    amountUsd: number,
    creditsIssued: number
  ): Promise<X402PrepaymentResponse> {
    try {
      const isCashSupported = await phantomCashService.supportsCashPayments();

      if (!isCashSupported) {
        logger.warn('Phantom CASH not yet available, using mock');
      }

      const cashMint = phantomCashService.getCashMint();
      const lamports = phantomCashService.cashToLamports(amountUsd);

      const transaction = await prisma.x402Transaction.create({
        data: {
          userId,
          amountUsd,
          creditsIssued,
          status: 'pending',
          facilitator: 'phantom',
          currency: 'CASH',
          tokenMint: cashMint,
        },
      });

      logger.info('x402 CASH prepayment initiated', {
        transactionId: transaction.id,
        userId,
        amountUsd,
        creditsIssued,
        cashMint,
        lamports: lamports.toString(),
      });

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      return {
        transactionId: transaction.id,
        amount: amountUsd,
        creditsIssued,
        currency: 'CASH',
        tokenMint: cashMint,
        paymentUrl: `solana:${process.env.AGENTFORGE_PAYMENT_WALLET || 'DEMO_WALLET'}?amount=${lamports}&spl-token=${cashMint}`,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to initiate CASH prepayment', error);
      throw new AppError('CASH prepayment failed', 500);
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
