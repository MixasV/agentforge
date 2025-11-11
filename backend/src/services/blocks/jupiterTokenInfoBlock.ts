import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const jupiterTokenInfoBlock: BlockDefinition = {
  name: 'Jupiter Token Info',
  description: 'Search and get detailed information about a Solana token (price, mcap, liquidity, stats)',
  category: 'data',
  inputs: [
    {
      name: 'query',
      type: 'string',
      required: true,
      description: 'Token symbol, name, or mint address (e.g., "SOL", "USDC", or mint address)',
    },
  ],
  outputs: [
    {
      name: 'token',
      type: 'object',
      description: 'Full token information',
    },
    {
      name: 'mint',
      type: 'string',
      description: 'Token mint address',
    },
    {
      name: 'symbol',
      type: 'string',
      description: 'Token symbol',
    },
    {
      name: 'name',
      type: 'string',
      description: 'Token name',
    },
    {
      name: 'price',
      type: 'number',
      description: 'Current USD price',
    },
    {
      name: 'mcap',
      type: 'number',
      description: 'Market cap in USD',
    },
    {
      name: 'fdv',
      type: 'number',
      description: 'Fully diluted valuation in USD',
    },
    {
      name: 'liquidity',
      type: 'number',
      description: 'Total liquidity in USD',
    },
    {
      name: 'holderCount',
      type: 'number',
      description: 'Number of token holders',
    },
    {
      name: 'priceChange24h',
      type: 'number',
      description: 'Price change in last 24 hours (%)',
    },
    // Audit fields - IMPORTANT for token safety analysis
    {
      name: 'mintAuthorityDisabled',
      type: 'boolean',
      description: 'Mint authority disabled (true = no new tokens can be created, SAFE)',
    },
    {
      name: 'freezeAuthorityDisabled',
      type: 'boolean',
      description: 'Freeze authority disabled (true = tokens cannot be frozen, SAFE)',
    },
    {
      name: 'topHoldersPercentage',
      type: 'number',
      description: 'Percentage of tokens held by top holders (high = manipulation risk)',
    },
    {
      name: 'devBalancePercentage',
      type: 'number',
      description: 'Percentage of tokens held by developer (high = rug pull risk)',
    },
    {
      name: 'organicScore',
      type: 'number',
      description: 'Jupiter organic score (0-100, higher is better, measures real trading activity)',
    },
  ],
  creditsCost: 1,
  execute: async (inputs) => {
    try {
      const { query } = inputs;

      if (!query || String(query).trim() === '') {
        logger.warn('Jupiter Token Info called with empty query - returning instruction message');
        return {
          error: 'NO_QUERY',
          message: 'Please provide a token symbol, name, or mint address to search.',
          instruction: 'Send me a token symbol (e.g., SOL, BONK) or mint address to get token information.',
          token: null,
        };
      }

      logger.info('Jupiter token search', { query });

      const response = await fetch(
        `https://lite-api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Jupiter Token API error', { status: response.status, error: errorText });
        throw new Error(`Jupiter Token API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error(`No token found for query: "${query}". Try using exact symbol or mint address.`);
      }

      // Get first result (most relevant)
      const token = data[0];

      logger.info('Jupiter token found', { 
        symbol: token.symbol, 
        name: token.name,
        price: token.usdPrice,
        mcap: token.mcap,
      });

      return {
        token: token,
        mint: token.id,
        symbol: token.symbol,
        name: token.name,
        price: token.usdPrice || 0,
        mcap: token.mcap || 0,
        fdv: token.fdv || 0,
        liquidity: token.liquidity || 0,
        holderCount: token.holderCount || 0,
        priceChange24h: token.stats24h?.priceChange || 0,
        // Audit & Safety fields - CRITICAL for token analysis
        mintAuthorityDisabled: token.audit?.mintAuthorityDisabled ?? false,
        freezeAuthorityDisabled: token.audit?.freezeAuthorityDisabled ?? false,
        topHoldersPercentage: token.audit?.topHoldersPercentage ?? 0,
        devBalancePercentage: token.audit?.devBalancePercentage ?? 0,
        organicScore: token.organicScore || 0,
        // Additional useful data
        decimals: token.decimals,
        icon: token.icon,
        isVerified: token.isVerified,
        audit: token.audit, // Full audit object
      };
    } catch (error: any) {
      logger.error('Jupiter Token Info block failed', error);
      throw new Error(error.message || 'Failed to fetch token information');
    }
  },
};
