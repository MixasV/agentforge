import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { userSettingsService } from '../services/userSettingsService';
import { telegramService } from '../services/telegramService';
import { logger } from '../utils/logger';

const router = express.Router();

const updateTelegramBotSchema = z.object({
  botToken: z.string().min(10, 'Bot token must be at least 10 characters'),
});

router.get('/telegram', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const settings = await userSettingsService.getSettings(userId);

    const hasToken = !!settings.telegramBotToken;
    
    let webhookStatus = null;
    if (settings.telegramBotToken) {
      const info = await telegramService.getWebhookInfo(settings.telegramBotToken);
      webhookStatus = info ? {
        url: info.url,
        isSet: !!info.url,
        pendingUpdates: info.pending_update_count,
        lastError: info.last_error_message,
      } : null;
    }

    res.json({
      success: true,
      data: {
        hasToken,
        botUsername: settings.telegramBotUsername,
        webhookStatus,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get Telegram settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/telegram', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { botToken } = updateTelegramBotSchema.parse(req.body);

    const botInfo = await telegramService.getBotInfo(botToken);
    if (!botInfo) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bot token. Please check and try again.',
      });
    }

    await userSettingsService.updateTelegramBotToken(
      userId,
      botToken,
      botInfo.username
    );

    return res.json({
      success: true,
      data: {
        botUsername: botInfo.username,
        message: 'Telegram bot token saved successfully',
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message,
      });
    }

    logger.error('Failed to update Telegram bot token', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.delete('/telegram', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    const botToken = await userSettingsService.getTelegramBotToken(userId);
    if (botToken) {
      await telegramService.deleteWebhook(botToken);
    }

    await userSettingsService.deleteTelegramBotToken(userId);

    res.json({
      success: true,
      message: 'Telegram bot token deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete Telegram bot token', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
