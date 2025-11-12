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
  { amount: 1, credits: 1000, label: 'Starter' },
  { amount: 10, credits: 10000, label: 'Popular' },
  { amount: 50, credits: 50000, label: 'Pro' },
];

type Currency = 'USDC' | 'CASH';

export function PrepaymentModal({ isOpen, onClose, onSuccess }: PrepaymentModalProps) {
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USDC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setTransactionId] = useState<string | null>(null);
  
  // Auto-recharge settings
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [autoRechargeThreshold, setAutoRechargeThreshold] = useState(999);
  const [autoRechargeAmount, setAutoRechargeAmount] = useState(10);

  const prepayMutation = useMutation({
    mutationFn: async (params: { 
      amountUsd: number; 
      currency: Currency;
      autoRecharge?: {
        enabled: boolean;
        threshold: number;
        amount: number;
        currency: 'USDC' | 'CASH';
      };
    }) => {
      const response = await api.post('/api/credits/prepay', params);
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

    if (isNaN(amount) || amount < 1 || amount > 1000) {
      toast.error('Amount must be between $1 and $1000');
      return;
    }

    // Pass auto-recharge settings to backend
    prepayMutation.mutate({ 
      amountUsd: amount, 
      currency: selectedCurrency,
      autoRecharge: autoRechargeEnabled ? {
        enabled: true,
        threshold: autoRechargeThreshold,
        amount: autoRechargeAmount,
        currency: selectedCurrency // ✅ USE SAME CURRENCY!
      } : undefined
    });
  };

  const handleClose = () => {
    if (!isProcessing) {
      setSelectedAmount(10);
      setCustomAmount('');
      setSelectedCurrency('USDC');
      setAutoRechargeEnabled(false);
      setAutoRechargeThreshold(999);
      setAutoRechargeAmount(10);
      setTransactionId(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          handleClose();
        }
      }}
    >
      <div className="bg-dark-card rounded-xl max-w-2xl w-full border border-dark-border max-h-[90vh] flex flex-col">
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

        <div className="p-6 overflow-y-auto">
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
                    min="1"
                    max="1000"
                    className="w-full pl-8 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum $1, Maximum $1000</p>
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

              {/* Auto-Recharge Section */}
              <div className="mb-6 border-t border-dark-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Auto-Recharge</h3>
                    <p className="text-xs text-gray-400">
                      Automatically top up when balance drops below threshold
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRechargeEnabled}
                      onChange={(e) => setAutoRechargeEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-solana-purple"></div>
                  </label>
                </div>

                {autoRechargeEnabled && (
                  <div className="space-y-4 bg-dark-bg rounded-lg p-4 border border-dark-border">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Trigger Threshold: {autoRechargeThreshold.toLocaleString()} credits
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="10000"
                        step="100"
                        value={autoRechargeThreshold}
                        onChange={(e) => setAutoRechargeThreshold(parseInt(e.target.value))}
                        className="w-full h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-solana-purple"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>100</span>
                        <span>10,000</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Auto-Recharge Amount: ${autoRechargeAmount}
                      </label>
                      <select
                        value={autoRechargeAmount}
                        onChange={(e) => setAutoRechargeAmount(parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:border-solana-purple"
                      >
                        <option value={1}>$1 (1,000 credits)</option>
                        <option value={5}>$5 (5,000 credits)</option>
                        <option value={10}>$10 (10,000 credits)</option>
                        <option value={20}>$20 (20,000 credits)</option>
                        <option value={50}>$50 (50,000 credits)</option>
                      </select>
                    </div>

                    <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
                      <p className="text-xs text-yellow-300 flex items-start gap-2">
                        <span className="mt-0.5">⚠️</span>
                        <span>
                          You'll be asked to authorize delegated payments via Phantom wallet.
                          Funds will be automatically charged when your balance drops below {autoRechargeThreshold.toLocaleString()} credits.
                        </span>
                      </p>
                    </div>
                  </div>
                )}
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
                {prepayMutation.isPending ? 'Processing...' : autoRechargeEnabled ? 'Authorize Auto-Recharge' : `Proceed with ${selectedCurrency}`}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                {autoRechargeEnabled 
                  ? 'Phantom will open twice: once for this payment, once for auto-recharge authorization'
                  : 'Real Solana transaction - Phantom wallet will open for signature'
                }
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
