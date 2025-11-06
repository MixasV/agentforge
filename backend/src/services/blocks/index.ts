import { BlockDefinition } from '../../types';
import { jupiterQuoteBlock } from './jupiterQuoteBlock';
import { pumpFunDataBlock } from './pumpFunDataBlock';
import { heliusBalanceBlock } from './heliusBalanceBlock';
import { llmAnalysisBlock } from './llmAnalysisBlock';
import { solanaAccountInfoBlock } from './solanaAccountInfoBlock';
import { filterBlock } from './filterBlock';
import { mapBlock } from './mapBlock';
import { conditionalBlock } from './conditionalBlock';
import { sendTelegramBlock } from './sendTelegramBlock';
import { solanaSwapBlock } from './solanaSwapBlock';

export const BLOCKS_REGISTRY: Record<string, BlockDefinition> = {
  jupiter_quote: jupiterQuoteBlock,
  pump_fun_data: pumpFunDataBlock,
  helius_balance: heliusBalanceBlock,
  llm_analysis: llmAnalysisBlock,
  solana_account_info: solanaAccountInfoBlock,
  filter: filterBlock,
  map: mapBlock,
  conditional: conditionalBlock,
  send_telegram: sendTelegramBlock,
  solana_swap: solanaSwapBlock,
};

export const BLOCKS_LIST = Object.values(BLOCKS_REGISTRY);
