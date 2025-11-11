import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { telegramService } from '../telegramService';

export const sendTelegramBlock: BlockDefinition = {
  name: 'Send Telegram Message',
  description: 'Send a message via Telegram bot',
  category: 'telegram',
  inputs: [
    {
      name: 'botToken',
      type: 'string',
      required: false,
      description: 'Telegram Bot Token from @BotFather (auto-filled from $context or environment)',
    },
    {
      name: 'chatId',
      type: 'string',
      required: false,
      description: 'Telegram chat ID (auto-filled from $context - Telegram Trigger)',
    },
    {
      name: 'message',
      type: 'string',
      required: true,
      description: 'Message text to send',
    },
    {
      name: 'parseMode',
      type: 'string',
      required: false,
      description: 'Parse mode: HTML, Markdown, or MarkdownV2',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether message was sent successfully',
    },
    {
      name: 'messageId',
      type: 'number',
      description: 'ID of sent message',
    },
    {
      name: 'chatId',
      type: 'string',
      description: 'Chat ID where message was sent',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      // Extract values with $context fallback
      const $context = (inputs as any).$context || {};
      
      const botToken = inputs.botToken || $context.botToken;
      const chatId = inputs.chatId || $context.chatId;
      const message = inputs.message;
      const parseMode = inputs.parseMode || 'Markdown'; // Markdown by default (AI agents use ** for bold, _ for italic)

      // Validation
      if (!botToken || String(botToken).trim() === '') {
        throw new Error('Bot Token is required. Provide it in block config, connect to Telegram Trigger, or set TELEGRAM_BOT_TOKEN in environment.');
      }

      if (!chatId || String(chatId).trim() === '') {
        throw new Error('Chat ID is required. Provide it in block config or connect to Telegram Trigger to use sender chat automatically.');
      }

      if (!message || String(message).trim() === '') {
        throw new Error('Message text is required. Cannot send empty message.');
      }

      // Validate bot token format (skip if it's a template reference)
      const tokenStr = String(botToken);
      if (tokenStr.includes('{{') && tokenStr.includes('}}')) {
        throw new Error(`Bot Token contains unresolved reference: ${tokenStr}. Make sure the variable is set correctly.`);
      }
      
      if (!tokenStr.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
        throw new Error(`Invalid Bot Token format. Got: "${tokenStr}". Expected format: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"`);
      }

      logger.info('Sending Telegram message', { 
        chatId, 
        messageLength: String(message).length 
      });

      const result = await telegramService.sendMessage(
        botToken as string,
        chatId as string,
        message as string,
        parseMode as string
      );

      if (!result.ok) {
        throw new Error(result.description || 'Failed to send message');
      }

      logger.info('Telegram message sent successfully', { 
        chatId, 
        messageId: result.message_id 
      });

      return {
        success: true,
        messageId: result.message_id,
        chatId: chatId as string,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Send Telegram block failed', error);
      
      // User-friendly error messages
      let userMessage = error.message;
      
      if (error.response?.status === 404) {
        userMessage = 'Telegram bot not found. Check your Bot Token from @BotFather.';
      } else if (error.response?.status === 403) {
        userMessage = 'Bot is blocked or not allowed to send messages. User may have blocked the bot or bot is not added to the chat.';
      } else if (error.response?.status === 400) {
        const errorDescription = error.response?.data?.description || '';
        if (errorDescription.includes('chat not found')) {
          userMessage = 'Chat not found. Check your Chat ID. Get it from @userinfobot or use channel @username.';
        } else if (errorDescription.includes('bot was blocked')) {
          userMessage = 'Bot was blocked by the user. Ask user to unblock the bot and send /start.';
        } else if (errorDescription.includes('invalid token')) {
          userMessage = 'Invalid Bot Token. Get a new token from @BotFather using /token command.';
        } else {
          userMessage = `Telegram API error: ${errorDescription}`;
        }
      }
      
      throw new Error(userMessage);
    }
  },
};
