import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';

export const heliusBalanceBlock: BlockDefinition = {
  name: 'Helius Balance Check',
  description: 'Get wallet balance and token holdings',
  category: 'data',
  inputs: [
    {
      name: 'walletAddress',
      type: 'string',
      required: true,
      description: 'Solana wallet address',
    },
  ],
  outputs: [
    {
      name: 'balanceSol',
      type: 'number',
      description: 'SOL balance',
    },
    {
      name: 'tokenBalances',
      type: 'array',
      description: 'Token balances',
    },
  ],
  creditsCost: 1,
  execute: async (inputs) => {
    try {
      const { walletAddress } = inputs;

      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const publicKey = new PublicKey(walletAddress as string);

      const balance = await connection.getBalance(publicKey);
      const balanceSol = balance / LAMPORTS_PER_SOL;

      logger.debug('Balance checked', { walletAddress, balanceSol });

      return {
        walletAddress,
        balanceSol,
        balanceLamports: balance,
        tokenBalances: [],
      };
    } catch (error) {
      logger.error('Helius balance block failed', error);
      throw error;
    }
  },
};
