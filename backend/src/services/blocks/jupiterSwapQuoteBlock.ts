import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';

export const jupiterSwapQuoteBlock: BlockDefinition = {
  name: 'Jupiter Swap Quote',
  description: 'Get best swap route and price quote for swapping tokens on Solana',
  category: 'data',
  inputs: [
    {
      name: 'inputMint',
      type: 'string',
      required: true,
      description: 'Input token mint address (token you want to swap FROM)',
    },
    {
      name: 'outputMint',
      type: 'string',
      required: true,
      description: 'Output token mint address (token you want to swap TO)',
    },
    {
      name: 'amount',
      type: 'string',
      required: true,
      description: 'Amount to swap in raw token units (before decimals). Example: 1000000 = 1 SOL (9 decimals)',
    },
    {
      name: 'slippageBps',
      type: 'number',
      required: false,
      description: 'Slippage tolerance in basis points (default: 50 = 0.5%)',
    },
  ],
  outputs: [
    {
      name: 'quote',
      type: 'object',
      description: 'Full quote response (use this for executing swap)',
    },
    {
      name: 'inAmount',
      type: 'string',
      description: 'Input amount (raw)',
    },
    {
      name: 'outAmount',
      type: 'string',
      description: 'Expected output amount (raw)',
    },
    {
      name: 'priceImpact',
      type: 'number',
      description: 'Price impact percentage',
    },
    {
      name: 'route',
      type: 'string',
      description: 'Route description (DEXes used)',
    },
  ],
  creditsCost: 1,
  execute: async (inputs) => {
    try {
      const { 
        inputMint, 
        outputMint, 
        amount,
        slippageBps = 50,
      } = inputs;

      // Validate required inputs
      if (!inputMint || !outputMint || !amount) {
        throw new Error(
          `Missing required parameters:\n` +
          `- inputMint: ${inputMint ? '✓' : '✗ Required'}\n` +
          `- outputMint: ${outputMint ? '✓' : '✗ Required'}\n` +
          `- amount: ${amount ? '✓' : '✗ Required'}\n\n` +
          `Example:\n` +
          `- inputMint: So11111111111111111111111111111111111111112 (SOL)\n` +
          `- outputMint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (USDC)\n` +
          `- amount: 1000000 (1 SOL with 9 decimals)`
        );
      }

      logger.info('Jupiter swap quote request', { 
        inputMint, 
        outputMint, 
        amount, 
        slippageBps 
      });

      const url = new URL('https://lite-api.jup.ag/swap/v1/quote');
      url.searchParams.append('inputMint', inputMint as string);
      url.searchParams.append('outputMint', outputMint as string);
      url.searchParams.append('amount', amount as string);
      url.searchParams.append('slippageBps', String(slippageBps));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Jupiter Quote API error', { 
          status: response.status, 
          error: errorText 
        });
        throw new Error(
          `Jupiter Quote API error (${response.status}): ${errorText || response.statusText}\n\n` +
          `Check that:\n` +
          `1. Token mint addresses are correct\n` +
          `2. Amount is in raw units (e.g., 1000000 for 1 SOL)\n` +
          `3. There is sufficient liquidity for this swap`
        );
      }

      const data = await response.json();

      // Build route description
      const routeDescription = data.routePlan
        .map((step: any) => step.swapInfo.label)
        .join(' → ');

      logger.info('Jupiter quote received', {
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        priceImpact: data.priceImpactPct,
        route: routeDescription,
      });

      return {
        quote: data,
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        priceImpact: parseFloat(data.priceImpactPct),
        route: routeDescription,
        slippage: data.slippageBps,
        swapMode: data.swapMode,
        routePlan: data.routePlan,
      };
    } catch (error: any) {
      logger.error('Jupiter Swap Quote block failed', error);
      throw new Error(error.message || 'Failed to fetch swap quote');
    }
  },
};
