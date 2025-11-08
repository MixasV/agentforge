import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { X, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface PrepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [
  { amount: 10, credits: 10000, label: 'Starter' },
  { amount: 50, credits: 50000, label: 'Popular' },
  { amount: 100, credits: 100000, label: 'Pro' },
];

type Currency = 'USDC' | 'CASH';

export function PrepaymentModal({ isOpen, onClose, onSuccess }: PrepaymentModalProps) {
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USDC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setTransactionId] = useState<string | null>(null);

  const prepayMutation = useMutation({
    mutationFn: async ({ amountUsd, currency }: { amountUsd: number; currency: Currency }) => {
      const response = await api.post('/api/credits/prepay', { amountUsd, currency });
      return response.data;
    },
    onSuccess: (data) => {
      setTransactionId(data.data.transactionId);
      setIsProcessing(true);
      processPhantomPayment(data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to initiate prepayment');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ txId, signature }: { txId: string; signature: string }) => {
      const response = await api.post(`/api/credits/prepay/${txId}/confirm`, { signature });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Credits added successfully!');
      setIsProcessing(false);
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Payment confirmation failed');
      setIsProcessing(false);
    },
  });

  const processPhantomPayment = async (transactionData: any) => {
    try {
      const { solana } = window as any;
      
      if (!solana?.isPhantom) {
        toast.error('Phantom wallet not found');
        setIsProcessing(false);
        return;
      }

      console.log('🔵 Opening Phantom for transaction signature...');
      
      // Create real Solana transaction
      const { Connection, Transaction, PublicKey, SystemProgram } = await import('@solana/web3.js');
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      
      const transaction = new Transaction();
      const recipientPubkey = new PublicKey(transactionData.data.recipientAddress);
      const senderPubkey = new PublicKey(await solana.publicKey.toString());
      
      // Add transfer instruction (in lamports - 1 SOL = 1,000,000,000 lamports)
      // For demo: transfer 0.01 SOL (~$2 on mainnet, free on devnet)
      const lamports = Math.floor(transactionData.data.amountUsd * 10000000); // 0.01 SOL per $1
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      console.log('📝 Transaction prepared, requesting signature...');
      
      // Request signature from Phantom
      const signed = await solana.signAndSendTransaction(transaction);
      console.log('✅ Transaction signed!', signed.signature);
      
      // Wait for confirmation
      toast.loading('Confirming on blockchain...', { duration: 3000 });
      await connection.confirmTransaction(signed.signature);
      
      console.log('✅ Transaction confirmed on blockchain');
      
      // Confirm with backend
      confirmMutation.mutate({
        txId: transactionData.data.transactionId,
        signature: signed.signature,
      });
    } catch (error: any) {
      console.error('❌ Transaction failed:', error);
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error('Transaction failed: ' + error.message);
      }
      setIsProcessing(false);
    }
  };

  const handlePrepay = () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;

    if (isNaN(amount) || amount < 10 || amount > 1000) {
      toast.error('Amount must be between $10 and $1000');
      return;
    }

    prepayMutation.mutate({ amountUsd: amount, currency: selectedCurrency });
  };

  const handleClose = () => {
    if (!isProcessing) {
      setSelectedAmount(50);
      setCustomAmount('');
      setSelectedCurrency('USDC');
      setTransactionId(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-card rounded-xl max-w-2xl w-full border border-dark-border my-8">
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-semibold">Add Credits via x402</h2>
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          {isProcessing ? (
            <div className="text-center py-8">
              <div className="animate-spin w-16 h-16 border-4 border-solana-purple border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Processing Payment...</h3>
              <p className="text-sm text-gray-400 mb-4">
                Please wait while we confirm your transaction
              </p>
              <p className="text-xs text-gray-500">
                In production, this would wait for Solana blockchain confirmation
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-6">
                Choose an amount to prepay. Credits never expire and can be used for all API calls.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedCurrency('USDC')}
                    className={clsx(
                      'p-4 rounded-lg border-2 transition-all text-left',
                      selectedCurrency === 'USDC'
                        ? 'border-solana-purple bg-solana-purple/10'
                        : 'border-dark-border hover:border-solana-purple/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">💵</span>
                      <span className="font-semibold">USDC</span>
                    </div>
                    <p className="text-xs text-gray-400">Original stablecoin</p>
                  </button>

                  <button
                    onClick={() => setSelectedCurrency('CASH')}
                    className={clsx(
                      'p-4 rounded-lg border-2 transition-all text-left',
                      selectedCurrency === 'CASH'
                        ? 'border-pink-600 bg-pink-600/10'
                        : 'border-dark-border hover:border-pink-600/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">💰</span>
                      <span className="font-semibold">Phantom CASH</span>
                    </div>
                    <p className="text-xs text-gray-400">New by Phantom</p>
                  </button>
                </div>
              </div>

              {selectedCurrency === 'CASH' && (
                <div className="bg-pink-600/10 border border-pink-600/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-pink-300 flex items-center gap-2">
                    <span>✨</span>
                    Powered by Phantom CASH - Seamless payments through Phantom wallet
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-6">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset.amount}
                    onClick={() => {
                      setSelectedAmount(preset.amount);
                      setCustomAmount('');
                    }}
                    className={clsx(
                      'p-3 rounded-lg border-2 transition-all text-center',
                      selectedAmount === preset.amount && !customAmount
                        ? 'border-solana-purple bg-solana-purple/10'
                        : 'border-dark-border hover:border-solana-purple/50'
                    )}
                  >
                    <div className="mb-1">
                      <span className="font-semibold text-xl block">${preset.amount}</span>
                      <span className="text-xs px-2 py-0.5 bg-solana-green/10 text-solana-green rounded inline-block">
                        {preset.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {preset.credits.toLocaleString()} credits
                    </p>
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Custom Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter custom amount"
                    min="10"
                    max="1000"
                    className="w-full pl-8 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum $10, Maximum $1000</p>
              </div>

              <div className="bg-dark-bg rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Amount</span>
                  <span className="font-semibold">
                    ${customAmount || selectedAmount}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Currency</span>
                  <span className="font-semibold text-solana-purple">
                    {selectedCurrency}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Credits Issued</span>
                  <span className="font-semibold text-solana-green">
                    {((parseFloat(customAmount) || selectedAmount) * 1000).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePrepay}
                disabled={prepayMutation.isPending}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50',
                  selectedCurrency === 'CASH'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                    : 'bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg'
                )}
              >
                <Wallet size={20} />
                {prepayMutation.isPending ? 'Processing...' : `Proceed with ${selectedCurrency}`}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Real Solana transaction - Phantom wallet will open for signature.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
