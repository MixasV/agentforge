import { BlockDefinition } from '../../types';
import { jupiterTokenInfoBlock } from './jupiterTokenInfoBlock';
import { jupiterSwapQuoteBlock } from './jupiterSwapQuoteBlock';
import { pumpFunDataBlock } from './pumpFunDataBlock';
import { heliusBalanceBlock } from './heliusBalanceBlock';
import { llmAnalysisBlock } from './llmAnalysisBlock';
import { aiAgentBlock } from './aiAgentBlock';
import { solanaAccountInfoBlock } from './solanaAccountInfoBlock';
import { filterBlock } from './filterBlock';
import { mapBlock } from './mapBlock';
import { conditionalBlock } from './conditionalBlock';
import { sendTelegramBlock } from './sendTelegramBlock';
import { sendTelegramInlineKeyboardBlock } from './sendTelegramInlineKeyboardBlock';
import { handleCallbackQueryBlock } from './handleCallbackQueryBlock';
import { parseTelegramCommandBlock } from './parseTelegramCommandBlock';
import { getTelegramUserInfoBlock } from './getTelegramUserInfoBlock';
import { editTelegramMessageBlock } from './editTelegramMessageBlock';
import { deleteTelegramMessageBlock } from './deleteTelegramMessageBlock';
import { getConversationStateBlock } from './getConversationStateBlock';
import { setConversationStateBlock } from './setConversationStateBlock';
import { sendChatActionBlock } from './sendChatActionBlock';
import { solanaSwapBlock } from './solanaSwapBlock';
import { telegramTriggerBlock } from './telegramTriggerBlock';
import { scheduleTriggerBlock } from './scheduleTriggerBlock';
import { manualTriggerBlock } from './manualTriggerBlock';
import { webhookTriggerBlock } from './webhookTriggerBlock';
import { authorizeSessionKeyBlock } from './authorizeSessionKeyBlock';
import { executeTradeWithSessionKeyBlock } from './executeTradeWithSessionKeyBlock';

export const BLOCKS_REGISTRY: Record<string, BlockDefinition> = {
  // Triggers
  telegram_trigger: telegramTriggerBlock,
  schedule_trigger: scheduleTriggerBlock,
  manual_trigger: manualTriggerBlock,
  webhook_trigger: webhookTriggerBlock,
  
  // Solana & Trading
  jupiter_token_info: jupiterTokenInfoBlock,
  jupiter_swap_quote: jupiterSwapQuoteBlock,
  pump_fun_data: pumpFunDataBlock,
  helius_balance: heliusBalanceBlock,
  solana_account_info: solanaAccountInfoBlock,
  solana_swap: solanaSwapBlock,
  
  // Session Keys
  authorize_session_key: authorizeSessionKeyBlock,
  execute_trade_with_session_key: executeTradeWithSessionKeyBlock,
  
  // Telegram Actions
  send_telegram: sendTelegramBlock,
  send_telegram_inline_keyboard: sendTelegramInlineKeyboardBlock,
  handle_callback_query: handleCallbackQueryBlock,
  edit_telegram_message: editTelegramMessageBlock,
  delete_telegram_message: deleteTelegramMessageBlock,
  
  // Telegram Logic/Data
  parse_telegram_command: parseTelegramCommandBlock,
  get_telegram_user_info: getTelegramUserInfoBlock,
  get_conversation_state: getConversationStateBlock,
  set_conversation_state: setConversationStateBlock,
  send_chat_action: sendChatActionBlock,
  
  // Logic & AI
  llm_analysis: llmAnalysisBlock,
  ai_agent: aiAgentBlock,
  filter: filterBlock,
  map: mapBlock,
  conditional: conditionalBlock,
};

export const BLOCKS_LIST = Object.values(BLOCKS_REGISTRY);
