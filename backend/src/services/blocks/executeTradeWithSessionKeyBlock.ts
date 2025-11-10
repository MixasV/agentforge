import { BlockDefinition } from '../../types';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { decryptSessionKey } from '../../utils/sessionKeyEncryption';

const NATIVE_SOL = 'So11111111111111111111111111111111111111112';
const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';

export const executeTradeWithSessionKeyBlock: BlockDefinition = {
  name: 'Execute Trade with Session Key',
  description: 'Executes token swap using session key',
  category: 'action',
  inputs: [
    {
      name: 'userId',
      type: 'string',
      required: true,
      description: 'User ID',
    },
    {
      name: 'fromToken',
      type: 'string',
      required: true,
      description: 'Input token mint (or "SOL")',
    },
    {
      name: 'toToken',
      type: 'string',
      required: true,
      description: 'Output token mint',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      description: 'Amount to trade',
    },
    {
      name: 'slippageBps',
      type: 'number',
      required: false,
      description: 'Slippage (basis points)',
    },
  ],
  outputs: [
    {
      name: 'success',
      type: 'boolean',
      description: 'Trade success status',
    },
    {
      name: 'signature',
      type: 'string',
      description: 'Transaction signature',
    },
    {
      name: 'explorerUrl',
      type: 'string',
      description: 'Solscan link',
    },
    {
      name: 'inputAmount',
      type: 'number',
      description: 'Amount sent',
    },
    {
      name: 'outputAmount',
      type: 'number',
      description: 'Amount received',
    },
    {
      name: 'transactionsRemaining',
      type: 'number',
      description: 'Remaining trades',
    },
  ],
  creditsCost: 2,
  execute: async (inputs) => {
    try {
      const {
        userId,
        fromToken,
        toToken,
        amount,
        slippageBps = 50,
      } = inputs;

      logger.info('Executing trade with session key', {
        userId,
        fromToken,
        toToken,
        amount,
      });

      // STEP 1: Get active session
      const session = await prisma.userSession.findFirst({
        where: {
          userId: userId as string,
          status: 'authorized',
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        throw new Error(
          'No active session found. Please authorize bot first (/start)'
        );
      }

      // STEP 2: Validate limits
      const amountSol = Number(amount);
      const amountLamports = BigInt(Math.floor(amountSol * 1e9));

      if (amountLamports > session.maxAmountPerTx) {
        throw new Error(
          `Amount exceeds limit. Max: ${
            Number(session.maxAmountPerTx) / 1e9
          } SOL per trade`
        );
      }

      const transactionsUsed = session.transactionsUsed || 0;
      if (transactionsUsed >= session.maxTransactions) {
        throw new Error(
          `Transaction limit reached (${session.maxTransactions} trades). Please re-authorize`
        );
      }

      // STEP 3: Get Jupiter quote
      const inputMint =
        fromToken === 'SOL' ? NATIVE_SOL : (fromToken as string);
      const outputMint = toToken as string;
      const amountInSmallestUnit = Math.floor(amountSol * 1e9);

      const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInSmallestUnit}&slippageBps=${slippageBps}`;

      logger.debug('Fetching Jupiter quote', { quoteUrl });

      const quoteResponse = await fetch(quoteUrl);
      if (!quoteResponse.ok) {
        throw new Error(`Jupiter quote failed: ${quoteResponse.statusText}`);
      }

      const quoteData = await quoteResponse.json() as {
        inAmount: string;
        outAmount: string;
        priceImpactPct: number;
        routePlan: unknown;
      };

      logger.debug('Jupiter quote received', {
        inAmount: quoteData.inAmount,
        outAmount: quoteData.outAmount,
        priceImpact: quoteData.priceImpactPct,
      });

      // STEP 4: Decrypt session key
      const sessionKeyPrivate = await decryptSessionKey(
        session.sessionKeyPrivate,
        session.encryptionIV,
        userId as string
      );

      const keypair = Keypair.fromSecretKey(
        Buffer.from(sessionKeyPrivate, 'base64')
      );

      logger.debug('Session key decrypted', {
        publicKey: keypair.publicKey.toString(),
      });

      // STEP 5: Get swap transaction from Jupiter
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: keypair.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      });

      if (!swapResponse.ok) {
        throw new Error(`Jupiter swap failed: ${swapResponse.statusText}`);
      }

      const swapData = await swapResponse.json() as {
        swapTransaction: string;
      };

      // STEP 6: Sign and send transaction
      const swapTransactionBuf = Buffer.from(
        swapData.swapTransaction,
        'base64'
      );
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      transaction.sign([keypair]);

      const connection = new Connection(RPC_ENDPOINT, 'confirmed');

      logger.debug('Sending transaction to Solana');

      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
        }
      );

      // STEP 7: Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      logger.info('Trade executed successfully', {
        userId,
        signature,
        fromToken,
        toToken,
        amount,
      });

      // STEP 8: Update session usage
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          transactionsUsed: transactionsUsed + 1,
          lastUsedAt: new Date(),
        },
      });

      // STEP 9: Log transaction
      await prisma.sessionTransaction.create({
        data: {
          sessionId: session.id,
          signature,
          amount: amountLamports,
          fromToken: inputMint,
          toToken: outputMint,
          success: true,
        },
      });

      const transactionsRemaining =
        session.maxTransactions - transactionsUsed - 1;

      const network =
        process.env.SOLANA_NETWORK === 'mainnet-beta' ? '' : '?cluster=devnet';
      const explorerUrl = `https://solscan.io/tx/${signature}${network}`;

      return {
        success: true,
        signature,
        explorerUrl,
        inputAmount: Number(quoteData.inAmount) / 1e9,
        outputAmount: Number(quoteData.outAmount) / 1e9,
        priceImpact: quoteData.priceImpactPct,
        transactionsRemaining,
        message: `✅ Trade successful! ${transactionsRemaining} trades remaining`,
      };
    } catch (error) {
      logger.error('Execute trade with session key failed', error);

      // Log failed transaction
      try {
        const session = await prisma.userSession.findFirst({
          where: {
            userId: inputs.userId as string,
            isActive: true,
          },
        });

        if (session) {
          await prisma.sessionTransaction.create({
            data: {
              sessionId: session.id,
              signature: 'failed',
              amount: BigInt(0),
              fromToken: inputs.fromToken as string,
              toToken: inputs.toToken as string,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      } catch (logError) {
        logger.error('Failed to log error transaction', logError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Trade execution failed',
      };
    }
  },
};
