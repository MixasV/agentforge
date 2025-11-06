import { BlockDefinition } from '../../types';
import { logger } from '../../utils/logger';
import { Connection, PublicKey } from '@solana/web3.js';

const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';

export const solanaAccountInfoBlock: BlockDefinition = {
  name: 'Solana Account Info',
  description: 'Get Solana account information',
  category: 'data',
  inputs: [
    {
      name: 'accountAddress',
      type: 'string',
      required: true,
      description: 'Solana account address',
    },
  ],
  outputs: [
    {
      name: 'accountData',
      type: 'object',
      description: 'Account data',
    },
  ],
  creditsCost: 1,
  execute: async (inputs) => {
    try {
      const { accountAddress } = inputs;

      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const publicKey = new PublicKey(accountAddress as string);

      const accountInfo = await connection.getAccountInfo(publicKey);

      if (!accountInfo) {
        return {
          exists: false,
          accountAddress,
        };
      }

      logger.debug('Account info fetched', { accountAddress });

      return {
        exists: true,
        accountAddress,
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toBase58(),
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
      };
    } catch (error) {
      logger.error('Solana account info block failed', error);
      throw error;
    }
  },
};
