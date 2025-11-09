import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export class UserSettingsService {
  async getSettings(userId: string) {
    try {
      let settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        settings = await prisma.userSettings.create({
          data: { userId },
        });
      }

      return settings;
    } catch (error) {
      logger.error('Failed to get user settings', { userId, error });
      throw error;
    }
  }

  async updateTelegramBotToken(userId: string, botToken: string, botUsername?: string) {
    try {
      const settings = await prisma.userSettings.upsert({
        where: { userId },
        create: {
          userId,
          telegramBotToken: botToken,
          telegramBotUsername: botUsername,
        },
        update: {
          telegramBotToken: botToken,
          telegramBotUsername: botUsername,
          updatedAt: new Date(),
        },
      });

      logger.info('Telegram bot token updated', { userId, hasToken: !!botToken });
      return settings;
    } catch (error) {
      logger.error('Failed to update Telegram bot token', { userId, error });
      throw error;
    }
  }

  async getTelegramBotToken(userId: string): Promise<string | null> {
    try {
      const settings = await this.getSettings(userId);
      return settings.telegramBotToken;
    } catch (error) {
      logger.error('Failed to get Telegram bot token', { userId, error });
      return null;
    }
  }

  async deleteTelegramBotToken(userId: string) {
    try {
      await prisma.userSettings.update({
        where: { userId },
        data: {
          telegramBotToken: null,
          telegramBotUsername: null,
        },
      });

      logger.info('Telegram bot token deleted', { userId });
    } catch (error) {
      logger.error('Failed to delete Telegram bot token', { userId, error });
      throw error;
    }
  }
}

export const userSettingsService = new UserSettingsService();
