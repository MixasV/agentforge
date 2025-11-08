import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger';

interface CashTokenInfo {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUri: string;
}

export class PhantomCashService {
  private connection: Connection;
  private CASH_MINT: PublicKey;

  constructor() {
    const rpcEndpoint = process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcEndpoint, 'confirmed');
    
    this.CASH_MINT = new PublicKey('CASH11111111111111111111111111111111111111');
    
    logger.info('Phantom CASH Service initialized', {
      rpcEndpoint,
      cashMint: this.CASH_MINT.toString(),
    });
  }

  getCashTokenInfo(): CashTokenInfo {
    return {
      mint: this.CASH_MINT.toString(),
      name: 'Phantom Cash',
      symbol: 'CASH',
      decimals: 6,
      logoUri: 'https://phantom.app/cash-logo.png',
    };
  }

  async getTokenBalance(walletAddress: string, tokenMint?: string): Promise<number> {
    try {
      const mint = tokenMint ? new PublicKey(tokenMint) : this.CASH_MINT;
      const wallet = new PublicKey(walletAddress);

      const { value: accounts } = await this.connection.getTokenAccountsByOwner(wallet, {
        mint,
      });

      if (accounts.length === 0) {
        logger.debug('No CASH token account found', { walletAddress });
        return 0;
      }

      const tokenAccount = accounts[0];
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount.pubkey);

      const balance = parseFloat(accountInfo.value.amount) / Math.pow(10, 6);

      logger.debug('CASH balance retrieved', {
        walletAddress,
        balance,
      });

      return balance;
    } catch (error) {
      logger.error('Failed to get CASH balance', { walletAddress, error });
      return 0;
    }
  }

  async supportsCashPayments(): Promise<boolean> {
    try {
      const mintInfo = await this.connection.getAccountInfo(this.CASH_MINT);
      const isSupported = mintInfo !== null;

      logger.debug('CASH payment support check', {
        mint: this.CASH_MINT.toString(),
        isSupported,
      });

      return isSupported;
    } catch (error) {
      logger.error('Failed to check CASH support', error);
      return false;
    }
  }

  cashToLamports(cashAmount: number): bigint {
    return BigInt(Math.floor(cashAmount * 1_000_000));
  }

  lamportsToCash(lamports: bigint): number {
    return Number(lamports) / 1_000_000;
  }

  getCashMint(): string {
    return this.CASH_MINT.toString();
  }
}

export const phantomCashService = new PhantomCashService();
