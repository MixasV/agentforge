import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const solanaSwapBlock: BlockDefinition = {
  name: 'Solana Swap Execute',
  description: 'Execute token swap on Solana',
  category: 'action',
  inputs: [
    {
      name: 'routePlan',
      type: 'object',
      required: true,
      description: 'Jupiter route plan from quote',
    },
    {
      name: 'slippageBps',
      type: 'number',
      required: false,
      description: 'Slippage tolerance in basis points',
    },
  ],
  outputs: [
    {
      name: 'txHash',
      type: 'string',
      description: 'Transaction hash',
    },
    {
      name: 'success',
      type: 'boolean',
      description: 'Whether swap was successful',
    },
  ],
  creditsCost: 5,
  execute: async (inputs) => {
    try {
      const { routePlan, slippageBps = 50 } = inputs;

      const mockTxHash = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      logger.info('Swap executed (mock)', { slippageBps, txHash: mockTxHash });

      return {
        txHash: mockTxHash,
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Solana swap block failed', error);
      throw error;
    }
  },
};
