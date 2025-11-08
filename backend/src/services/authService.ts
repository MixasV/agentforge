import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { prisma } from '../utils/prisma';
import { generateToken } from '../middleware/auth';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { cdpWalletService } from './cdpWalletService';

export interface PhantomLoginPayload {
  walletAddress: string;
  signature: string;
  message: string;
}

export class AuthService {
  async loginWithPhantom(payload: PhantomLoginPayload) {
    try {
      const isValid = this.verifyPhantomSignature(
        payload.message,
        payload.signature,
        payload.walletAddress
      );

      if (!isValid) {
        throw new AppError('Invalid signature', 401);
      }

      let user = await prisma.user.findUnique({
        where: { walletAddress: payload.walletAddress },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            walletAddress: payload.walletAddress,
            credits: {
              create: {
                balance: 1000,
              },
            },
          },
        });
        logger.info('New user created', { userId: user.id, walletAddress: user.walletAddress });
      }

      const token = generateToken({
        userId: user.id,
        walletAddress: user.walletAddress || undefined,
      });

      return {
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          createdAt: user.createdAt,
        },
        token,
      };
    } catch (error) {
      logger.error('Phantom login failed', error);
      throw error;
    }
  }

  verifyPhantomSignature(message: string, signature: string, walletAddress: string): boolean {
    try {
      const publicKey = new PublicKey(walletAddress);
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);

      return nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );
    } catch (error) {
      logger.error('Signature verification failed', error);
      return false;
    }
  }

  async loginWithTelegram(telegramUserId: bigint, username?: string) {
    try {
      let user = await prisma.user.findUnique({
        where: { telegramUserId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            telegramUserId,
            credits: {
              create: {
                balance: 1000,
              },
            },
          },
        });
        logger.info('New Telegram user created', {
          userId: user.id,
          telegramUserId: telegramUserId.toString(),
          username,
        });
      }

      const token = generateToken({
        userId: user.id,
        telegramUserId: telegramUserId.toString(),
      });

      return {
        user: {
          id: user.id,
          telegramUserId: user.telegramUserId?.toString(),
          createdAt: user.createdAt,
        },
        token,
      };
    } catch (error) {
      logger.error('Telegram login failed', error);
      throw error;
    }
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        credits: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      telegramUserId: user.telegramUserId?.toString(),
      email: user.email,
      loginMethod: user.loginMethod,
      credits: user.credits ? Number(user.credits.balance) : 0,
      createdAt: user.createdAt,
    };
  }

  async initiateEmailLogin(email: string) {
    if (!cdpWalletService.isEnabled()) {
      throw new AppError('CDP email login not configured', 503);
    }

    try {
      const flowId = `flow-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      logger.info('Email login initiated', { email, flowId });

      return {
        flowId,
        email,
        message: 'OTP sent to email',
      };
    } catch (error) {
      logger.error('Failed to initiate email login', error);
      throw new AppError('Failed to send OTP', 500);
    }
  }

  async verifyEmailOTP(_flowId: string, otp: string, email: string) {
    if (!cdpWalletService.isEnabled()) {
      throw new AppError('CDP email login not configured', 503);
    }

    try {
      if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        throw new AppError('Invalid OTP format', 400);
      }

      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            emailVerified: true,
            loginMethod: 'cdp',
            lastLoginAt: new Date(),
            credits: {
              create: {
                balance: 1000,
              },
            },
          },
        });

        logger.info('New CDP user created', { userId: user.id, email });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            loginMethod: 'cdp',
            lastLoginAt: new Date(),
          },
        });
      }

      const cdpAccount = await cdpWalletService.getOrCreateWallet(email, user.id);

      const token = generateToken({
        userId: user.id,
        email,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          walletAddress: cdpAccount.walletAddress,
          loginMethod: 'cdp',
          createdAt: user.createdAt,
        },
        token,
      };
    } catch (error) {
      logger.error('Email OTP verification failed', error);
      throw error instanceof AppError ? error : new AppError('OTP verification failed', 400);
    }
  }
}

export const authService = new AuthService();
