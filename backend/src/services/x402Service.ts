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
  amountUsd: number;
  creditsIssued: number;
  currency: string;
  tokenMint?: string;
  paymentUrl?: string;
  recipientAddress: string;
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
        amountUsd,
        creditsIssued,
        currency: 'USDC',
        recipientAddress: process.env.AGENTFORGE_PAYMENT_WALLET || '',
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
        amountUsd,
        creditsIssued,
        currency: 'CASH',
        tokenMint: cashMint,
        recipientAddress: process.env.AGENTFORGE_PAYMENT_WALLET || '',
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

  async confirmPayment(transactionId: string, userId: string, signature: string) {
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
        logger.warn('Transaction already confirmed', { transactionId });
        return { success: true, message: 'Transaction already confirmed' };
      }

      // Verify transaction on Solana blockchain
      logger.info('Verifying Solana transaction', { signature });
      const isValid = await this.verifySolanaTransaction(signature, transaction);

      if (!isValid) {
        await prisma.x402Transaction.update({
          where: { id: transactionId },
          data: { status: 'failed' },
        });
        throw new AppError('Invalid or failed transaction', 400);
      }

      await prisma.$transaction(async (tx) => {
        await tx.x402Transaction.update({
          where: { id: transactionId },
          data: {
            status: 'confirmed',
            txHash: signature,
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
        signature,
        creditsIssued: Number(transaction.creditsIssued),
      });

      return {
        success: true,
        creditsGranted: Number(transaction.creditsIssued),
        txHash: signature,
      };
    } catch (error) {
      logger.error('Failed to confirm payment', error);
      throw error;
    }
  }

  private async verifySolanaTransaction(signature: string, transaction: any): Promise<boolean> {
    try {
      const { Connection, PublicKey } = await import('@solana/web3.js');
      const connection = new Connection(
        process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com',
        'confirmed'
      );

      // Get transaction details from blockchain
      const txInfo = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo || !txInfo.meta) {
        logger.warn('Transaction not found on blockchain', { signature });
        return false;
      }

      if (txInfo.meta.err) {
        logger.warn('Transaction failed on blockchain', { signature, error: txInfo.meta.err });
        return false;
      }

      // Verify recipient and amount
      const recipientAddress = process.env.AGENTFORGE_PAYMENT_WALLET;
      if (!recipientAddress) {
        logger.error('AGENTFORGE_PAYMENT_WALLET not configured');
        return false;
      }

      const recipientPubkey = new PublicKey(recipientAddress);
      const accountKeys = txInfo.transaction.message.getAccountKeys();
      const recipientIndex = accountKeys.staticAccountKeys.findIndex(
        (key: any) => key.toString() === recipientPubkey.toString()
      );

      if (recipientIndex === -1) {
        logger.warn('Recipient not found in transaction', { signature, recipientAddress });
        return false;
      }

      // Verify amount (in lamports)
      const expectedLamports = Math.floor(transaction.amountUsd * 10000000); // 0.01 SOL per $1
      const postBalance = txInfo.meta.postBalances[recipientIndex];
      const preBalance = txInfo.meta.preBalances[recipientIndex];
      const receivedLamports = postBalance - preBalance;

      logger.info('Transaction verification', {
        signature,
        expectedLamports,
        receivedLamports,
        match: Math.abs(receivedLamports - expectedLamports) < 1000000, // Allow 0.001 SOL tolerance
      });

      // Allow some tolerance for fees
      if (Math.abs(receivedLamports - expectedLamports) > 1000000) {
        logger.warn('Amount mismatch', { expectedLamports, receivedLamports });
        return false;
      }

      logger.info('Transaction verified successfully', { signature });
      return true;
    } catch (error) {
      logger.error('Transaction verification failed', { signature, error });
      return false;
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
      
      // For simulation, bypass verification and directly confirm
      await prisma.$transaction(async (tx) => {
        await tx.x402Transaction.update({
          where: { id: transactionId },
          data: {
            status: 'confirmed',
            txHash: mockTxHash,
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
