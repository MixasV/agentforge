import axios from 'axios';
import { logger } from '../utils/logger';

interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
  };
  date: number;
  text?: string;
}

export class TelegramService {
  private getApiUrl(botToken: string): string {
    return `https://api.telegram.org/bot${botToken}`;
  }

  async setWebhook(botToken: string, webhookUrl: string): Promise<{ success: boolean; description?: string }> {
    try {
      const url = `${this.getApiUrl(botToken)}/setWebhook`;
      
      const response = await axios.post(url, {
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      });

      if (response.data.ok) {
        logger.info('Telegram webhook set successfully', { webhookUrl });
        return { success: true };
      } else {
        logger.error('Failed to set Telegram webhook', { 
          webhookUrl, 
          error: response.data.description 
        });
        return { 
          success: false, 
          description: response.data.description 
        };
      }
    } catch (error: any) {
      logger.error('Error setting Telegram webhook', { 
        webhookUrl, 
        error: error.message 
      });
      return { 
        success: false, 
        description: error.message 
      };
    }
  }

  async deleteWebhook(botToken: string): Promise<{ success: boolean }> {
    try {
      const url = `${this.getApiUrl(botToken)}/deleteWebhook`;
      const response = await axios.post(url, { drop_pending_updates: true });

      if (response.data.ok) {
        logger.info('Telegram webhook deleted successfully');
        return { success: true };
      } else {
        logger.error('Failed to delete Telegram webhook', { 
          error: response.data.description 
        });
        return { success: false };
      }
    } catch (error: any) {
      logger.error('Error deleting Telegram webhook', { error: error.message });
      return { success: false };
    }
  }

  async getWebhookInfo(botToken: string): Promise<TelegramWebhookInfo | null> {
    try {
      const url = `${this.getApiUrl(botToken)}/getWebhookInfo`;
      const response = await axios.get(url);

      if (response.data.ok) {
        return response.data.result;
      } else {
        logger.error('Failed to get webhook info', { error: response.data.description });
        return null;
      }
    } catch (error: any) {
      logger.error('Error getting webhook info', { error: error.message });
      return null;
    }
  }

  async getBotInfo(botToken: string): Promise<{ username?: string; first_name?: string } | null> {
    try {
      const url = `${this.getApiUrl(botToken)}/getMe`;
      const response = await axios.get(url);

      if (response.data.ok) {
        return response.data.result;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  async sendMessage(botToken: string, chatId: string, text: string): Promise<boolean> {
    try {
      const url = `${this.getApiUrl(botToken)}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      });

      return response.data.ok;
    } catch (error: any) {
      logger.error('Failed to send Telegram message', { 
        chatId, 
        error: error.message 
      });
      return false;
    }
  }

  parseTelegramUpdate(update: any): {
    messageText: string;
    chatId: string;
    userId: string;
    userName?: string;
    messageId: number;
  } | null {
    try {
      if (!update.message || !update.message.text) {
        return null;
      }

      const message: TelegramMessage = update.message;

      return {
        messageText: message.text || '',
        chatId: message.chat.id.toString(),
        userId: message.from.id.toString(),
        userName: message.from.username,
        messageId: message.message_id,
      };
    } catch (error) {
      logger.error('Failed to parse Telegram update', { error });
      return null;
    }
  }
}

export const telegramService = new TelegramService();
