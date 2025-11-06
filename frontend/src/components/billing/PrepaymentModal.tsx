import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { X, Wallet, CheckCircle } from 'lucide-react';
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

export function PrepaymentModal({ isOpen, onClose, onSuccess }: PrepaymentModalProps) {
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const prepayMutation = useMutation({
    mutationFn: async (amountUsd: number) => {
      const response = await api.post('/api/credits/prepay', { amountUsd });
      return response.data;
    },
    onSuccess: (data) => {
      setTransactionId(data.data.transactionId);
      setIsProcessing(true);
      simulatePayment(data.data.transactionId);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to initiate prepayment');
    },
  });

  const simulateMutation = useMutation({
    mutationFn: async (txId: string) => {
      const response = await api.post(`/api/credits/prepay/${txId}/simulate`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Credits added successfully!');
      setIsProcessing(false);
      onSuccess();
      handleClose();
    },
    onError: () => {
      toast.error('Payment simulation failed');
      setIsProcessing(false);
    },
  });

  const simulatePayment = (txId: string) => {
    setTimeout(() => {
      simulateMutation.mutate(txId);
    }, 2000);
  };

  const handlePrepay = () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;

    if (isNaN(amount) || amount < 10 || amount > 1000) {
      toast.error('Amount must be between $10 and $1000');
      return;
    }

    prepayMutation.mutate(amount);
  };

  const handleClose = () => {
    if (!isProcessing) {
      setSelectedAmount(50);
      setCustomAmount('');
      setTransactionId(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-xl max-w-md w-full border border-dark-border">
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

              <div className="space-y-3 mb-6">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset.amount}
                    onClick={() => {
                      setSelectedAmount(preset.amount);
                      setCustomAmount('');
                    }}
                    className={clsx(
                      'w-full p-4 rounded-lg border-2 transition-all text-left',
                      selectedAmount === preset.amount && !customAmount
                        ? 'border-solana-purple bg-solana-purple/10'
                        : 'border-dark-border hover:border-solana-purple/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">${preset.amount}</span>
                      <span className="text-xs px-2 py-1 bg-solana-green/10 text-solana-green rounded">
                        {preset.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Wallet size={20} />
                {prepayMutation.isPending ? 'Processing...' : 'Proceed with Payment'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                In development mode, payment is simulated. In production, this would open Phantom wallet.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
