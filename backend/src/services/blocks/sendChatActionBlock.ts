import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { telegramService } from '../telegramService';

export const sendChatActionBlock: BlockDefinition = {
  name: 'Send Chat Action',
  description: 'Shows typing indicator or other chat action to user',
  category: 'action',
  inputs: [
    {
      name: 'botToken',
      type: 'string',
      required: true,
      description: 'Telegram Bot Token from @BotFather',
    },
    {
      name: 'chatId',
      type: 'string',
      required: true,
      description: 'Telegram chat ID',
    },
    {
      name: 'action',
      type: 'string',
      required: false,
      description: 'Action type: typing, upload_photo, record_video, upload_document, etc.',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether action was sent successfully',
    },
  ],
  creditsCost: 0,
  execute: async (inputs) => {
    try {
      const { botToken, chatId, action = 'typing' } = inputs;

      if (!botToken || !chatId) {
        throw new Error('botToken and chatId are required');
      }

      // Valid chat actions:
      // typing - for text messages
      // upload_photo - for photos
      // record_video or upload_video - for videos
      // record_voice or upload_voice - for voice notes
      // upload_document - for general files
      // choose_sticker - for stickers
      // find_location - for location data
      // record_video_note or upload_video_note - for video notes
      
      const validActions = [
        'typing',
        'upload_photo',
        'record_video',
        'upload_video',
        'record_voice',
        'upload_voice',
        'upload_document',
        'choose_sticker',
        'find_location',
        'record_video_note',
        'upload_video_note',
      ];

      const chatAction = String(action).toLowerCase();
      
      if (!validActions.includes(chatAction)) {
        logger.warn('Invalid chat action, using "typing"', { action: chatAction });
      }

      await telegramService.sendChatAction(
        String(botToken),
        String(chatId),
        validActions.includes(chatAction) ? chatAction : 'typing'
      );

      logger.debug('Chat action sent', {
        chatId: String(chatId),
        action: chatAction,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Send chat action block failed', error);
      throw error;
    }
  },
};
