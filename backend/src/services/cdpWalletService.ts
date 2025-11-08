import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

interface CDPUserAccount {
  userId: string;
  email: string;
  walletAddress: string;
  cdpWalletId: string;
}

export class CDPWalletService {
  private coinbaseClient: Coinbase | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const apiKeyId = process.env.CDP_API_KEY_ID;
      const apiKeySecret = process.env.CDP_API_KEY_SECRET;

      if (!apiKeyId || !apiKeySecret) {
        logger.warn('CDP credentials not configured. CDP features will be disabled.');
        return;
      }

      this.coinbaseClient = Coinbase.configure({
        apiKeyName: apiKeyId,
        privateKey: apiKeySecret,
      });

      this.isConfigured = true;
      logger.info('CDP Wallet Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CDP Wallet Service', error);
      this.isConfigured = false;
    }
  }

  async createUserWallet(email: string, userId: string): Promise<CDPUserAccount> {
    if (!this.isConfigured || !this.coinbaseClient) {
      throw new AppError('CDP service not configured', 503);
    }

    try {
      const wallet = await Wallet.create({
        networkId: 'solana-mainnet',
      });

      const address = await wallet.getDefaultAddress();
      if (!address) {
        throw new AppError('Failed to get wallet address', 500);
      }

      const walletId = wallet.getId() || '';
      const walletAddress = address.getId() || '';

      if (!walletId || !walletAddress) {
        throw new AppError('Failed to retrieve wallet identifiers', 500);
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          cdpWalletId: walletId,
          cdpUserId: userId,
          walletAddress,
          loginMethod: 'cdp',
          lastLoginAt: new Date(),
        },
      });

      logger.info('CDP wallet created', {
        userId,
        email,
        walletId,
        walletAddress,
      });

      return {
        userId,
        email,
        walletAddress,
        cdpWalletId: walletId,
      };
    } catch (error) {
      logger.error('CDP wallet creation failed', error);
      throw new AppError('Failed to create CDP wallet', 500);
    }
  }

  async getOrCreateWallet(email: string, userId: string): Promise<CDPUserAccount> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        cdpWalletId: true,
        walletAddress: true,
        email: true,
      },
    });

    if (user?.cdpWalletId && user?.walletAddress && user?.email) {
      return {
        userId,
        email: user.email,
        walletAddress: user.walletAddress,
        cdpWalletId: user.cdpWalletId,
      };
    }

    return await this.createUserWallet(email, userId);
  }

  isEnabled(): boolean {
    return this.isConfigured;
  }
}

export const cdpWalletService = new CDPWalletService();
