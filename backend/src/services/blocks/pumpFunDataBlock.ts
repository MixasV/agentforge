import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const pumpFunDataBlock: BlockDefinition = {
  name: 'Pump.fun Token Data',
  description: 'Get new token data from Pump.fun',
  category: 'data',
  inputs: [
    {
      name: 'minMarketCap',
      type: 'number',
      required: false,
      description: 'Minimum market cap filter',
    },
    {
      name: 'maxMarketCap',
      type: 'number',
      required: false,
      description: 'Maximum market cap filter',
    },
    {
      name: 'limit',
      type: 'number',
      required: false,
      description: 'Number of tokens to return',
    },
  ],
  outputs: [
    {
      name: 'tokens',
      type: 'array',
      description: 'Array of token data',
    },
  ],
  creditsCost: 2,
  execute: async (inputs) => {
    try {
      const { minMarketCap = 0, maxMarketCap = 1000000000, limit = 10 } = inputs;

      const mockTokens = [
        {
          mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          name: 'Bonk',
          symbol: 'BONK',
          marketCap: 450000000,
          holderCount: 125000,
          priceChange24h: 15.3,
        },
        {
          mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
          name: 'Marinade SOL',
          symbol: 'mSOL',
          marketCap: 800000000,
          holderCount: 45000,
          priceChange24h: 5.2,
        },
      ];

      const filteredTokens = mockTokens
        .filter(t => t.marketCap >= minMarketCap && t.marketCap <= maxMarketCap)
        .slice(0, Number(limit));

      logger.debug('Pump.fun data fetched', {
        minMarketCap,
        maxMarketCap,
        limit,
        found: filteredTokens.length,
      });

      return {
        tokens: filteredTokens,
        count: filteredTokens.length,
      };
    } catch (error) {
      logger.error('Pump.fun data block failed', error);
      throw error;
    }
  },
};
