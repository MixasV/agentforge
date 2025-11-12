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
      // CRITICAL: Delete webhook first to clear pending updates
      // This ensures old messages don't get delivered to new webhook
      await this.deleteWebhook(botToken);
      logger.info('🧹 Cleared old webhook and pending updates before setting new one');
      
      const url = `${this.getApiUrl(botToken)}/setWebhook`;
      
      logger.info('Setting webhook', { url, webhookUrl });
      
      const response = await axios.post(url, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      });

      logger.info('Telegram API response', { 
        ok: response.data.ok, 
        result: response.data.result,
        description: response.data.description 
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
        error: error.message,
        response: error.response?.data 
      });
      return { 
        success: false, 
        description: error.response?.data?.description || error.message 
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

  async getUpdates(
    botToken: string, 
    options: { limit?: number; offset?: number; timeout?: number } = {}
  ): Promise<any[]> {
    try {
      const url = `${this.getApiUrl(botToken)}/getUpdates`;
      const params = {
        limit: options.limit || 100,
        offset: options.offset || 0,
        timeout: options.timeout || 0,
        allowed_updates: ['message', 'callback_query', 'edited_message'],
      };

      const response = await axios.get(url, { params });

      if (response.data.ok) {
        return response.data.result || [];
      } else {
        logger.error('Failed to get updates', { error: response.data.description });
        return [];
      }
    } catch (error: any) {
      logger.error('Error getting updates', { error: error.message });
      return [];
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

  async sendMessage(
    botToken: string, 
    chatId: string, 
    text: string,
    parseMode: string = 'HTML'
  ): Promise<{ ok: boolean; message_id?: number; description?: string }> {
    try {
      const url = `${this.getApiUrl(botToken)}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      });

      if (response.data.ok) {
        return {
          ok: true,
          message_id: response.data.result.message_id,
        };
      } else {
        return {
          ok: false,
          description: response.data.description,
        };
      }
    } catch (error: any) {
      logger.error('Failed to send Telegram message', { 
        chatId, 
        error: error.message 
      });
      return {
        ok: false,
        description: error.message,
      };
    }
  }

  async sendMessageWithKeyboard(
    botToken: string,
    chatId: string,
    text: string,
    keyboard: any[][],
    parseMode: string = 'HTML'
  ): Promise<{ ok: boolean; message_id?: number; description?: string }> {
    try {
      const url = `${this.getApiUrl(botToken)}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });

      if (response.data.ok) {
        return {
          ok: true,
          message_id: response.data.result.message_id,
        };
      } else {
        return {
          ok: false,
          description: response.data.description,
        };
      }
    } catch (error: any) {
      logger.error('Failed to send Telegram message with keyboard', {
        chatId,
        error: error.message,
      });
      return {
        ok: false,
        description: error.message,
      };
    }
  }

  async editMessage(
    botToken: string,
    chatId: string,
    messageId: number,
    newText: string,
    parseMode: string = 'HTML'
  ): Promise<{ ok: boolean; description?: string }> {
    try {
      const url = `${this.getApiUrl(botToken)}/editMessageText`;
      const response = await axios.post(url, {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: parseMode,
      });

      return {
        ok: response.data.ok,
        description: response.data.description,
      };
    } catch (error: any) {
      logger.error('Failed to edit Telegram message', {
        chatId,
        messageId,
        error: error.message,
      });
      return {
        ok: false,
        description: error.message,
      };
    }
  }

  async deleteMessage(
    botToken: string,
    chatId: string,
    messageId: number
  ): Promise<{ ok: boolean; description?: string }> {
    try {
      const url = `${this.getApiUrl(botToken)}/deleteMessage`;
      const response = await axios.post(url, {
        chat_id: chatId,
        message_id: messageId,
      });

      return {
        ok: response.data.ok,
        description: response.data.description,
      };
    } catch (error: any) {
      logger.error('Failed to delete Telegram message', {
        chatId,
        messageId,
        error: error.message,
      });
      return {
        ok: false,
        description: error.message,
      };
    }
  }

  async answerCallbackQuery(
    botToken: string,
    callbackQueryId: string,
    text?: string,
    showAlert: boolean = false
  ): Promise<{ ok: boolean; description?: string }> {
    try {
      const url = `${this.getApiUrl(botToken)}/answerCallbackQuery`;
      const response = await axios.post(url, {
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      });

      return {
        ok: response.data.ok,
        description: response.data.description,
      };
    } catch (error: any) {
      logger.error('Failed to answer callback query', {
        callbackQueryId,
        error: error.message,
      });
      return {
        ok: false,
        description: error.message,
      };
    }
  }

  async sendChatAction(
    botToken: string,
    chatId: string,
    action: string
  ): Promise<{ ok: boolean; description?: string }> {
    try {
      const url = `${this.getApiUrl(botToken)}/sendChatAction`;
      const response = await axios.post(url, {
        chat_id: chatId,
        action: action,
      });

      return {
        ok: response.data.ok,
        description: response.data.description,
      };
    } catch (error: any) {
      logger.error('Failed to send chat action', {
        chatId,
        action,
        error: error.message,
      });
      return {
        ok: false,
        description: error.message,
      };
    }
  }

  parseTelegramUpdate(update: any): {
    messageText: string;
    chatId: string;
    userId: string;
    userName?: string;
    messageId: number;
    callbackData?: string;
    callbackQueryId?: string;
  } | null {
    try {
      // Handle regular message
      if (update.message && update.message.text) {
        const message: TelegramMessage = update.message;
        return {
          messageText: message.text || '',
          chatId: message.chat.id.toString(),
          userId: message.from.id.toString(),
          userName: message.from.username,
          messageId: message.message_id,
        };
      }

      // Handle callback_query (button click)
      if (update.callback_query) {
        const cbq = update.callback_query;
        return {
          messageText: cbq.data || '', // callback_data as message
          chatId: cbq.message?.chat.id.toString() || cbq.from.id.toString(),
          userId: cbq.from.id.toString(),
          userName: cbq.from.username,
          messageId: cbq.message?.message_id || 0,
          callbackData: cbq.data,
          callbackQueryId: cbq.id,
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to parse Telegram update', { error });
      return null;
    }
  }
}

export const telegramService = new TelegramService();
