import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const jupiterQuoteBlock: BlockDefinition = {
  name: 'Jupiter Swap Quote',
  description: 'Get a swap quote from Jupiter DEX aggregator',
  category: 'data',
  inputs: [
    {
      name: 'inputMint',
      type: 'string',
      required: true,
      description: 'Input token mint address',
    },
    {
      name: 'outputMint',
      type: 'string',
      required: true,
      description: 'Output token mint address',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      description: 'Amount to swap (in smallest unit)',
    },
  ],
  outputs: [
    {
      name: 'quote',
      type: 'object',
      description: 'Jupiter quote object',
    },
    {
      name: 'routePlan',
      type: 'object',
      description: 'Route plan for the swap',
    },
  ],
  creditsCost: 1,
  execute: async (inputs) => {
    try {
      const { inputMint, outputMint, amount } = inputs;

      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`
      );

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }

      const data = await response.json();

      logger.debug('Jupiter quote fetched', { inputMint, outputMint, amount });

      return {
        quote: data,
        routePlan: data.routePlan,
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        priceImpactPct: data.priceImpactPct,
      };
    } catch (error) {
      logger.error('Jupiter quote block failed', error);
      throw error;
    }
  },
};
